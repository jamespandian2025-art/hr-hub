'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Filter,
  Landmark,
  MoreHorizontal,
  Paperclip,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  Settings,
  SlidersHorizontal,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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

export default function AccountingSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params)

  if (section === 'accounting') return <AccountingDashboardPage />
  if (section === 'bills') return <BillsDashboardPage />
  if (section === 'expenses') return <ExpensesDashboardPage />

  const data = sectionData[section]
  const navMeta = accountingNavItems.find(item => item.href.endsWith(`/${section}`))
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

const accountingTabs = ['Dashboard', 'Chart of Accounts', 'Journal Entries', 'General Ledger', 'Trial Balance', 'Reconciliation', 'Fiscal Years', 'Settings']

const accountingMetrics = [
  { title: 'Total Assets', value: '$482,250.75', delta: '12.5% vs last month', icon: WalletCards, tone: '#16a34a', up: true },
  { title: 'Total Liabilities', value: '$182,450.30', delta: '8.3% vs last month', icon: Landmark, tone: '#2563eb', up: true },
  { title: 'Total Equity', value: '$299,800.45', delta: '9.7% vs last month', icon: PieChart, tone: '#f97316', up: true },
  { title: 'Net Income', value: '$48,249.50', delta: '26.3% vs last month', icon: ArrowUpRight, tone: '#2563eb', up: true },
  { title: 'Total Revenue', value: '$125,430.00', delta: '18.6% vs last month', icon: ReceiptText, tone: '#f59e0b', up: true },
  { title: 'Total Expenses', value: '$77,180.50', delta: '6.4% vs last month', icon: ArrowDownLeft, tone: '#ef4444', up: false },
]

const accountBalances = [
  ['Cash and Cash Equivalents', '1010', '$142,250.75', '#16a34a'],
  ['Accounts Receivable', '1200', '$98,450.30', '#2563eb'],
  ['Inventory', '1300', '$75,320.20', '#7c3aed'],
  ['Property, Plant & Equipment', '1500', '$210,000.00', '#f97316'],
  ['Accounts Payable', '2000', '$83,250.40', '#ef4444'],
  ['Long-term Liabilities', '2100', '$119,199.90', '#f97316'],
]

const journalEntries = [
  ['JE-2405-0012', 'May 31, 2024', 'Sales revenue for May', '$15,250.00'],
  ['JE-2405-0011', 'May 31, 2024', 'Office rent expense', '$3,200.00'],
  ['JE-2405-0010', 'May 30, 2024', 'Utility expense', '$820.50'],
  ['JE-2405-0009', 'May 31, 2024', 'Payment to supplier', '$4,500.00'],
  ['JE-2405-0008', 'May 29, 2024', 'Bank charges', '$45.00'],
]

const accountingTransactions = [
  ['May 31, 2024', 'JE-2405-0012', 'Sales revenue for May', '4000 - Sales Revenue', 'Journal Entry', '-', '$15,250.00', 'Posted'],
  ['May 31, 2024', 'RCPT-2405-0045', 'Payment from Acme Corp.', '1100 - Cash in Bank', 'Receipt', '$7,500.00', '-', 'Posted'],
  ['May 30, 2024', 'JE-2405-0011', 'Office rent expense', '6100 - Rent Expense', 'Journal Entry', '$3,200.00', '-', 'Posted'],
  ['May 30, 2024', 'PAY-2405-0033', 'Payment to ABC Supplies', '1100 - Cash in Bank', 'Payment', '-', '$4,500.00', 'Posted'],
  ['May 29, 2024', 'JE-2405-0009', 'Utility expense', '6200 - Utilities Expense', 'Journal Entry', '$820.50', '-', 'Posted'],
  ['May 28, 2024', 'ADJ-2405-0003', 'Adjusting entry', '3100 - Retained Earnings', 'Adjustment', '$250.00', '$250.00', 'Posted'],
]

const bankAccounts = [
  ['Chase Business Checking', '.... 1234', '$28,350.20', '#2563eb'],
  ['Wells Fargo Business', '.... 5678', '$14,250.55', '#ef4444'],
  ['PayPal Business', '.... 9012', '$5,650.00', '#0ea5e9'],
]

const accountingQuickActions: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'New Journal Entry', icon: FileText },
  { label: 'Reconcile Account', icon: Landmark },
  { label: 'Chart of Accounts', icon: BookOpenCheck },
  { label: 'Create Adjustment', icon: WalletCards },
]

const reportShortcuts: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: 'Profit & Loss', body: 'View P&L report', icon: ArrowUpRight },
  { title: 'Balance Sheet', body: 'View balance sheet', icon: FileText },
  { title: 'Cash Flow Statement', body: 'View cash flow', icon: ArrowUpRight },
  { title: 'Trial Balance', body: 'View trial balance', icon: BookOpenCheck },
  { title: 'General Ledger', body: 'View general ledger', icon: FileBarChart },
  { title: 'All Reports', body: 'Browse all reports', icon: Settings },
]

function AccountingDashboardPage() {
  return (
    <div style={{ padding: '26px 28px 40px', fontFamily: font }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, color: '#0f172a', fontWeight: 950 }}>Accounting</h1>
        <p style={{ margin: '8px 0 0', color: '#334155', fontSize: 13.5 }}>Manage your general ledger, chart of accounts, journal entries, and financial records.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28, borderBottom: '1px solid #e8edf4', marginBottom: 18 }}>
        {accountingTabs.map((tab, index) => (
          <button key={tab} type="button" style={{ border: 0, borderBottom: index === 0 ? '2px solid #16a34a' : '2px solid transparent', background: 'transparent', color: index === 0 ? '#16a34a' : '#0f172a', minHeight: 42, padding: 0, fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>
            {tab}
          </button>
        ))}
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(150px, 1fr))', gap: 14, marginBottom: 16 }}>
        {accountingMetrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 43, height: 43, borderRadius: 8, background: `${metric.tone}12`, color: metric.tone, display: 'grid', placeItems: 'center' }}><Icon size={21} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#475569', fontSize: 12, fontWeight: 850 }}>{metric.title}</div>
                  <div style={{ marginTop: 8, color: '#0f172a', fontSize: 21, fontWeight: 950, whiteSpace: 'nowrap' }}>{metric.value}</div>
                  <div style={{ marginTop: 8, color: metric.up ? '#16a34a' : '#ef4444', fontSize: 11.5, fontWeight: 900 }}>{metric.up ? 'Up' : 'Down'} {metric.delta}</div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) 360px 360px', gap: 16, marginBottom: 16 }}>
        <AccountingPanel title="Profit & Loss Summary" action="This Month">
          <div style={{ height: 276, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 14 }}>
            <div style={{ display: 'flex', gap: 18, color: '#334155', fontSize: 12, fontWeight: 850 }}>
              <Legend color="#16a34a" label="Revenue" />
              <Legend color="#ef4444" label="Expenses" />
              <Legend color="#2563eb" label="Net Profit" />
            </div>
            <div style={{ position: 'relative', borderLeft: '1px solid #e8edf4', borderBottom: '1px solid #e8edf4', overflow: 'hidden' }}>
              {[0, 1, 2, 3].map(row => <span key={row} style={{ position: 'absolute', left: 0, right: 0, top: `${row * 25}%`, borderTop: '1px solid #eef2f7' }} />)}
              <svg viewBox="0 0 680 220" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <polyline points="0,165 60,132 120,88 180,90 240,82 300,84 360,60 420,52 480,50 540,64 600,38 680,62" fill="none" stroke="#16a34a" strokeWidth="3" />
                <polyline points="0,198 60,168 120,166 180,154 240,170 300,146 360,160 420,134 480,124 540,138 600,94 680,106" fill="none" stroke="#ef4444" strokeWidth="3" />
                <polyline points="0,214 60,188 120,190 180,186 240,196 300,174 360,180 420,154 480,148 540,172 600,134 680,146" fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </AccountingPanel>

        <AccountingPanel title="Account Balance Summary" link="/accounting/accounting">
          <div style={{ display: 'grid', gap: 12 }}>
            {accountBalances.map(([name, code, value, color]) => (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 7, background: `${color}12`, color, display: 'grid', placeItems: 'center' }}><Banknote size={15} /></span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong>
                  <small style={{ color: '#64748b', fontWeight: 800 }}>{code}</small>
                </span>
                <strong style={{ color: value.startsWith('$8') || value.startsWith('$119') ? '#ef4444' : '#16a34a', fontSize: 12.5 }}>{value}</strong>
              </div>
            ))}
          </div>
        </AccountingPanel>

        <AccountingPanel title="Recent Journal Entries" link="/accounting/accounting">
          <div style={{ display: 'grid', gap: 13 }}>
            {journalEntries.map(entry => (
              <div key={entry[0]} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 7, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}><FileText size={15} /></span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 12.5, color: '#0f172a' }}>{entry[0]}</strong>
                  <small style={{ display: 'block', color: '#64748b', fontWeight: 750 }}>{entry[1]}</small>
                  <small style={{ display: 'block', color: '#64748b', marginTop: 2 }}>{entry[2]}</small>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', fontSize: 12.5 }}>{entry[3]}</strong>
                  <small style={{ color: '#16a34a', fontWeight: 900 }}>Posted</small>
                </span>
              </div>
            ))}
          </div>
        </AccountingPanel>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, marginBottom: 16 }}>
        <AccountingPanel title="Recent Transactions" link="/accounting/transactions">
          <div style={{ display: 'flex', gap: 26, marginBottom: 12, color: '#0f172a', fontSize: 12.5, fontWeight: 900 }}>
            {['All', 'Journal Entries', 'Payments', 'Receipts', 'Adjustments'].map((tab, index) => <span key={tab} style={{ color: index === 0 ? '#16a34a' : '#0f172a', borderBottom: index === 0 ? '2px solid #16a34a' : '2px solid transparent', paddingBottom: 8 }}>{tab}</span>)}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Date', 'Reference', 'Description', 'Account', 'Type', 'Debit', 'Credit', 'Status'].map(column => <th key={column} style={thStyle}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {accountingTransactions.map(row => (
                <tr key={row[1]} style={{ borderTop: '1px solid #eef2f7' }}>
                  {row.map((cell, index) => <td key={`${row[1]}-${index}`} style={index === 7 ? tdStatusStyle : index === 1 ? tdStrongStyle : tdStyle}>{index === 7 ? <StatusPill value={cell} /> : cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </AccountingPanel>

        <div style={{ display: 'grid', gap: 16 }}>
          <AccountingPanel title="Bank Accounts" link="/accounting/banking">
            <div style={{ display: 'grid', gap: 13 }}>
              {bankAccounts.map(account => (
                <div key={account[0]} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 7, background: account[3], color: '#fff', display: 'grid', placeItems: 'center' }}><Building2 size={15} /></span>
                  <span><strong style={{ display: 'block', fontSize: 12.5 }}>{account[0]}</strong><small style={{ color: '#64748b', fontWeight: 800 }}>{account[1]}</small></span>
                  <span style={{ textAlign: 'right' }}><strong style={{ display: 'block', fontSize: 12.5 }}>{account[2]}</strong><small style={{ color: '#64748b' }}>Updated 2 hrs ago</small></span>
                </div>
              ))}
              <Link href="/accounting/banking" style={{ color: '#2563eb', fontSize: 12.5, fontWeight: 900, textAlign: 'center', textDecoration: 'none', paddingTop: 6 }}>+ Add Bank Account</Link>
            </div>
          </AccountingPanel>
          <AccountingPanel title="Quick Actions">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {accountingQuickActions.map(({ label, icon: Icon }) => (
                <button key={label} type="button" style={{ border: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 9, color: '#0f172a', fontSize: 12.5, fontWeight: 900, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 7, background: '#ecfdf3', color: '#16a34a', display: 'grid', placeItems: 'center' }}><Icon size={15} /></span>
                  {label}
                </button>
              ))}
            </div>
          </AccountingPanel>
        </div>
      </section>

      <AccountingPanel title="Reports Shortcuts">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(140px, 1fr))', gap: 14 }}>
          {reportShortcuts.map(({ title, body, icon: Icon }) => (
            <Link key={title} href="/accounting/reports" style={{ minHeight: 58, display: 'flex', alignItems: 'center', gap: 12, color: '#0f172a', textDecoration: 'none' }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfdf3', color: '#16a34a', display: 'grid', placeItems: 'center' }}><Icon size={16} /></span>
              <span><strong style={{ display: 'block', fontSize: 12.5 }}>{title}</strong><small style={{ color: '#64748b', marginTop: 3, display: 'block' }}>{body}</small></span>
            </Link>
          ))}
        </div>
      </AccountingPanel>
    </div>
  )
}

function AccountingPanel({ title, children, action, link }: { title: string; children: React.ReactNode; action?: string; link?: string }) {
  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: 15, fontWeight: 950 }}>{title}</h2>
        {link ? <Link href={link} style={{ color: '#2563eb', fontSize: 12, fontWeight: 900, textDecoration: 'none' }}>View All</Link> : action ? <button type="button" style={{ border: '1px solid #e8edf4', background: '#fff', borderRadius: 6, minHeight: 30, padding: '0 10px', color: '#0f172a', fontSize: 12, fontWeight: 900 }}>{action}</button> : null}
      </div>
      {children}
    </section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 14, height: 6, borderRadius: 999, background: color }} />{label}</span>
}

type BillRecord = {
  billNo: string
  vendor: string
  email: string
  billDate: string
  dueDate: string
  daysLabel: string
  amount: number
  paid: number
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Partially Paid' | 'Paid' | 'Due' | 'Overdue' | 'Cancelled'
}

const billTabs = ['All Bills', 'Draft', 'Pending Approval', 'Approved', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled']

const billRecords: BillRecord[] = [
  { billNo: 'BILL-2024-0096', vendor: 'ABC Supplies Co.', email: 'billing@abcsupplies.com', billDate: 'May 31, 2024', dueDate: 'Jun 30, 2024', daysLabel: '30 days', amount: 4850, paid: 4850, status: 'Paid' },
  { billNo: 'BILL-2024-0095', vendor: 'Office World, Inc.', email: 'ap@officeworld.com', billDate: 'May 30, 2024', dueDate: 'Jun 29, 2024', daysLabel: '29 days', amount: 1250, paid: 625, status: 'Partially Paid' },
  { billNo: 'BILL-2024-0094', vendor: 'Utility Company', email: 'billing@utilityco.com', billDate: 'May 29, 2024', dueDate: 'Jun 13, 2024', daysLabel: '13 days', amount: 2340, paid: 0, status: 'Overdue' },
  { billNo: 'BILL-2024-0093', vendor: 'Tech Solutions Ltd.', email: 'ap@techsolutions.com', billDate: 'May 28, 2024', dueDate: 'Jun 27, 2024', daysLabel: '27 days', amount: 12500, paid: 12500, status: 'Paid' },
  { billNo: 'BILL-2024-0092', vendor: 'Global Hardware', email: 'accounts@globalhardware.com', billDate: 'May 27, 2024', dueDate: 'Jun 26, 2024', daysLabel: '26 days', amount: 3780, paid: 0, status: 'Due' },
  { billNo: 'BILL-2024-0091', vendor: 'Internet Provider', email: 'billing@isp.com', billDate: 'May 26, 2024', dueDate: 'Jun 10, 2024', daysLabel: '10 days', amount: 320, paid: 0, status: 'Overdue' },
  { billNo: 'BILL-2024-0090', vendor: 'Packaging Corp.', email: 'ap@packagingcorp.com', billDate: 'May 25, 2024', dueDate: 'Jun 24, 2024', daysLabel: '24 days', amount: 6400, paid: 3200, status: 'Partially Paid' },
  { billNo: 'BILL-2024-0089', vendor: 'Prime Logistics', email: 'billing@primelogistics.com', billDate: 'May 24, 2024', dueDate: 'Jun 23, 2024', daysLabel: '23 days', amount: 1150, paid: 1150, status: 'Paid' },
  { billNo: 'BILL-2024-0088', vendor: 'Cleaning Services Inc.', email: 'ap@cleaningservices.com', billDate: 'May 23, 2024', dueDate: 'Jun 22, 2024', daysLabel: '22 days', amount: 980, paid: 0, status: 'Due' },
  { billNo: 'BILL-2024-0087', vendor: 'Printer Solutions', email: 'billing@printersolutions.com', billDate: 'May 22, 2024', dueDate: 'Jun 07, 2024', daysLabel: '7 days', amount: 450, paid: 0, status: 'Overdue' },
]

const billStatTargets = {
  count: 96,
  total: 243850,
  paid: 164700,
  due: 56400,
  overdue: 22750,
}

const billBottomCards = [
  { title: 'Unbilled Purchase Orders', count: 5, value: 18650, icon: SlidersHorizontal },
  { title: 'Bills Pending Approval', count: 8, value: 24300, icon: ReceiptText },
  { title: 'Upcoming Payments (Next 7 Days)', count: 6, value: 12850, icon: CalendarDays },
]

function BillsDashboardPage() {
  const outstanding = billRecords.reduce((sum, bill) => sum + Math.max(bill.amount - bill.paid, 0), 0)
  const tabs = billTabs.map(tab => ({
    label: tab,
    count: tab === 'All Bills' ? billStatTargets.count : billRecords.filter(bill => bill.status === tab).length,
  }))
  const metricCards = [
    { title: 'Total Bills', value: String(billStatTargets.count), delta: '14.3% vs last month', icon: FileText, tone: '#16a34a', up: true },
    { title: 'Total Amount', value: formatUsd(billStatTargets.total), delta: '18.7% vs last month', icon: ArrowUpRight, tone: '#2563eb', up: true },
    { title: 'Paid', value: formatUsd(billStatTargets.paid), delta: '22.1% vs last month', icon: CheckCircle2, tone: '#16a34a', up: true },
    { title: 'Due', value: formatUsd(billStatTargets.due), delta: '8.6% vs last month', icon: Clock3, tone: '#f59e0b', up: false },
    { title: 'Overdue', value: formatUsd(billStatTargets.overdue), delta: '12.4% vs last month', icon: Clock3, tone: '#ef4444', up: false },
  ]

  return (
    <div style={{ padding: '26px 28px 40px', fontFamily: font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, color: '#0f172a', fontWeight: 950 }}>Bills</h1>
          <p style={{ margin: '8px 0 0', color: '#334155', fontSize: 13.5 }}>Manage vendor bills and track payments.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <label style={{ width: 300, height: 40, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 13px', border: '1px solid #e8edf4' }}>
            <Search size={16} color="#64748b" />
            <input placeholder="Search bills, vendors, reference..." style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12.5, color: '#0f172a' }} />
          </label>
          <button type="button" style={toolbarButtonStyle}><Filter size={15} /> Filters</button>
          <button type="button" style={primaryButtonStyle}><Plus size={15} /> New Bill <ChevronDown size={13} /></button>
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(180px, 1fr))', gap: 18, marginBottom: 18 }}>
        {metricCards.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} style={{ ...cardStyle, minHeight: 100, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ width: 54, height: 54, borderRadius: 9, background: `${metric.tone}12`, color: metric.tone, display: 'grid', placeItems: 'center' }}><Icon size={23} /></span>
                <span>
                  <span style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 850 }}>{metric.title}</span>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: 24, marginTop: 8 }}>{metric.value}</strong>
                  <small style={{ display: 'block', color: metric.up ? '#16a34a' : '#ef4444', fontSize: 11.5, fontWeight: 900, marginTop: 8 }}>{metric.up ? 'Up' : 'Down'} {metric.delta}</small>
                </span>
              </div>
            </div>
          )
        })}
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 28, borderBottom: '1px solid #e8edf4', marginBottom: 0, paddingLeft: 14 }}>
        {tabs.map((tab, index) => (
          <button key={tab.label} type="button" style={{ border: 0, borderBottom: index === 0 ? '2px solid #16a34a' : '2px solid transparent', background: 'transparent', color: index === 0 ? '#16a34a' : '#0f172a', minHeight: 48, padding: 0, fontSize: 12.5, fontWeight: 900, cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <section style={{ ...cardStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 160px 160px 190px 160px 170px minmax(160px, auto) 42px', gap: 14, alignItems: 'center', marginBottom: 18 }}>
          <label style={filterInputStyle}><Search size={15} color="#64748b" /><input placeholder="Search bills..." style={inlineInputStyle} /></label>
          <button type="button" style={selectFilterStyle}>Vendor <ChevronDown size={14} /></button>
          <button type="button" style={selectFilterStyle}>Status <ChevronDown size={14} /></button>
          <button type="button" style={selectFilterStyle}><CalendarDays size={15} /> Date Range <ChevronDown size={14} /></button>
          <button type="button" style={selectFilterStyle}><CalendarDays size={15} /> Due Date <ChevronDown size={14} /></button>
          <button type="button" style={selectFilterStyle}><SlidersHorizontal size={15} /> More Filters</button>
          <button type="button" style={{ ...toolbarButtonStyle, justifySelf: 'end' }}>Export <Download size={14} /></button>
          <button type="button" aria-label="Bill table settings" style={moreButtonStyle}><Settings size={16} /></button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #eef2f7', borderRadius: 8 }}>
          <table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...thStyle, width: 40 }}><input type="checkbox" aria-label="Select all bills" /></th>
                {['Bill #', 'Vendor', 'Bill Date', 'Due Date', 'Amount', 'Paid', 'Balance Due', 'Status', 'Actions'].map(column => <th key={column} style={thStyle}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {billRecords.map(bill => {
                const balance = bill.amount - bill.paid
                return (
                  <tr key={bill.billNo} style={{ borderTop: '1px solid #eef2f7' }}>
                    <td style={tdStyle}><input type="checkbox" aria-label={`Select ${bill.billNo}`} /></td>
                    <td style={{ ...tdStrongStyle, color: '#16a34a' }}>{bill.billNo}</td>
                    <td style={tdStyle}><strong style={{ color: '#0f172a', display: 'block' }}>{bill.vendor}</strong><small style={{ color: '#64748b' }}>{bill.email}</small></td>
                    <td style={tdStyle}>{bill.billDate}</td>
                    <td style={tdStyle}><span style={{ display: 'block' }}>{bill.dueDate}</span><small style={{ color: '#64748b' }}>{bill.daysLabel}</small></td>
                    <td style={tdStrongStyle}>{formatUsd(bill.amount)}</td>
                    <td style={tdStrongStyle}>{formatUsd(bill.paid)}</td>
                    <td style={{ ...tdStrongStyle, color: balance === 0 ? '#0f172a' : bill.status === 'Overdue' ? '#ef4444' : '#f59e0b' }}>{formatUsd(balance)}</td>
                    <td style={tdStatusStyle}><BillStatusPill value={bill.status} /></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" aria-label={`View ${bill.billNo}`} style={moreButtonStyle}><Eye size={15} /></button>
                        <button type="button" aria-label={`Actions for ${bill.billNo}`} style={moreButtonStyle}><MoreHorizontal size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 16 }}>
          <strong style={{ color: '#0f172a', fontSize: 12.5 }}>Showing 1 to {billRecords.length} of {billStatTargets.count} bills</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {['‹', '1', '2', '3', '4', '5', '...', '10', '›'].map((page, index) => (
              <button key={`${page}-${index}`} type="button" style={{ width: page === '...' ? 24 : 34, height: 32, borderRadius: 7, border: page === '1' ? '1px solid #16a34a' : '1px solid #e8edf4', background: page === '1' ? '#16a34a' : '#fff', color: page === '1' ? '#fff' : '#0f172a', fontWeight: 900, cursor: 'pointer' }}>{page}</button>
            ))}
            <button type="button" style={selectFilterStyle}>10 / page <ChevronDown size={14} /></button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', border: '1px solid #e8edf4', borderRadius: 8, background: '#fff', marginTop: 16 }}>
        {billBottomCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={card.title} style={{ minHeight: 86, padding: '18px 22px', display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr) auto', gap: 14, alignItems: 'center', borderRight: index < billBottomCards.length - 1 ? '1px solid #eef2f7' : 'none' }}>
              <span style={{ width: 42, height: 42, borderRadius: 9, background: index === 1 ? '#f3e8ff' : '#eff6ff', color: index === 1 ? '#7c3aed' : '#2563eb', display: 'grid', placeItems: 'center' }}><Icon size={20} /></span>
              <span>
                <span style={{ display: 'block', color: '#0f172a', fontSize: 13, fontWeight: 900 }}>{card.title}</span>
                <strong style={{ display: 'inline-block', color: '#0f172a', fontSize: 22, marginTop: 7 }}>{card.count}</strong>
                <small style={{ marginLeft: 80, color: '#0f172a', fontWeight: 900 }}>{formatUsd(card.value)}</small>
              </span>
              <ChevronDown size={18} color="#0f172a" style={{ transform: 'rotate(-90deg)' }} />
            </div>
          )
        })}
      </section>
      <div style={{ marginTop: 10, color: '#64748b', fontSize: 12, fontWeight: 750 }}>Open balances total {formatUsd(outstanding)} across the visible bill queue.</div>
    </div>
  )
}

function formatUsd(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function BillStatusPill({ value }: { value: BillRecord['status'] }) {
  const styles: Record<BillRecord['status'], { bg: string; color: string }> = {
    Draft: { bg: '#f1f5f9', color: '#475569' },
    'Pending Approval': { bg: '#f3e8ff', color: '#7c3aed' },
    Approved: { bg: '#dbeafe', color: '#2563eb' },
    'Partially Paid': { bg: '#fef3c7', color: '#d97706' },
    Paid: { bg: '#dcfce7', color: '#15803d' },
    Due: { bg: '#fff7ed', color: '#f59e0b' },
    Overdue: { bg: '#fef2f2', color: '#ef4444' },
    Cancelled: { bg: '#f1f5f9', color: '#64748b' },
  }
  return <span style={{ display: 'inline-flex', minHeight: 26, alignItems: 'center', borderRadius: 7, padding: '0 10px', background: styles[value].bg, color: styles[value].color, fontSize: 11.5, fontWeight: 900 }}>{value}</span>
}

type ExpenseRecord = {
  date: string
  description: string
  merchant: string
  category: 'Meals & Entertainment' | 'Office Supplies' | 'Transportation' | 'Software' | 'Team Activities' | 'Utilities' | 'Marketing'
  employee: string
  department: string
  amount: number
  paymentMethod: 'Corporate Card' | 'Cash' | 'Bank Transfer'
  status: 'Pending Approval' | 'Approved' | 'Reimbursed' | 'To Reimburse' | 'Declined'
}

const expenseRecords: ExpenseRecord[] = [
  { date: 'May 31, 2024', description: 'Client Lunch Meeting', merchant: 'Manam Restaurant', category: 'Meals & Entertainment', employee: 'John User', department: 'Sales', amount: 85.5, paymentMethod: 'Corporate Card', status: 'Approved' },
  { date: 'May 30, 2024', description: 'Office Supplies', merchant: 'National Book Store', category: 'Office Supplies', employee: 'Jane Smith', department: 'Admin', amount: 120, paymentMethod: 'Cash', status: 'Pending Approval' },
  { date: 'May 30, 2024', description: 'Gasoline', merchant: 'Shell Gas Station', category: 'Transportation', employee: 'Michael Brown', department: 'Operations', amount: 45, paymentMethod: 'Corporate Card', status: 'Approved' },
  { date: 'May 29, 2024', description: 'Software Subscription', merchant: 'Adobe Inc.', category: 'Software', employee: 'John User', department: 'Sales', amount: 52.99, paymentMethod: 'Bank Transfer', status: 'Approved' },
  { date: 'May 28, 2024', description: 'Taxi Fare', merchant: 'Grab', category: 'Transportation', employee: 'Sarah Johnson', department: 'Marketing', amount: 18.6, paymentMethod: 'Cash', status: 'To Reimburse' },
  { date: 'May 27, 2024', description: 'Team Building Activity', merchant: 'Circuit Makati', category: 'Team Activities', employee: 'John User', department: 'Sales', amount: 450, paymentMethod: 'Corporate Card', status: 'Approved' },
  { date: 'May 26, 2024', description: 'Internet Bill', merchant: 'PLDT', category: 'Utilities', employee: 'Jane Smith', department: 'Admin', amount: 65, paymentMethod: 'Bank Transfer', status: 'Approved' },
  { date: 'May 25, 2024', description: 'Parking Fee', merchant: 'Ayala Center', category: 'Transportation', employee: 'Michael Brown', department: 'Operations', amount: 6, paymentMethod: 'Cash', status: 'To Reimburse' },
  { date: 'May 24, 2024', description: 'Marketing Materials', merchant: 'VistaPrint', category: 'Marketing', employee: 'Sarah Johnson', department: 'Marketing', amount: 135.75, paymentMethod: 'Corporate Card', status: 'Pending Approval' },
  { date: 'May 23, 2024', description: 'Electricity Bill', merchant: 'Meralco', category: 'Utilities', employee: 'Jane Smith', department: 'Admin', amount: 78.25, paymentMethod: 'Bank Transfer', status: 'Approved' },
]

const expenseSummary = {
  totalCount: 156,
  totalExpenses: 98450,
  monthTotal: 23450,
  previousMonth: 21630,
  approved: 72150,
  pending: 9850,
  reimburse: 16450,
}

const expenseTabs = ['All Expenses', 'Pending Approval', 'Approved', 'Reimbursed', 'To Reimburse', 'Declined']

function ExpensesDashboardPage() {
  const topCategory = expenseRecords.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount
    return totals
  }, {})
  const topCategoryName = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Meals & Entertainment'
  const topMerchant = expenseRecords.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.merchant] = (totals[expense.merchant] || 0) + expense.amount
    return totals
  }, {})
  const topMerchantEntry = Object.entries(topMerchant).sort((a, b) => b[1] - a[1])[0] || ['Grab', 0]
  const averagePerDay = expenseSummary.monthTotal / 31
  const metricCards = [
    { title: 'Total Expenses', value: formatUsd(expenseSummary.totalExpenses), detail: '12.6% vs last month', icon: FileText, tone: '#16a34a', up: true },
    { title: 'This Month', value: formatUsd(expenseSummary.monthTotal), detail: '8.4% vs last month', icon: ArrowUpRight, tone: '#2563eb', up: true },
    { title: 'Approved', value: formatUsd(expenseSummary.approved), detail: `${((expenseSummary.approved / expenseSummary.totalExpenses) * 100).toFixed(1)}% of total`, icon: CheckCircle2, tone: '#f59e0b' },
    { title: 'Pending Approval', value: formatUsd(expenseSummary.pending), detail: `${((expenseSummary.pending / expenseSummary.totalExpenses) * 100).toFixed(1)}% of total`, icon: ReceiptText, tone: '#7c3aed' },
    { title: 'To Reimburse', value: formatUsd(expenseSummary.reimburse), detail: `${((expenseSummary.reimburse / expenseSummary.totalExpenses) * 100).toFixed(1)}% of total`, icon: Clock3, tone: '#ef4444' },
  ]

  return (
    <div className="expenses-page" style={{ fontFamily: font }}>
      <style>{expensesResponsiveCss}</style>
      <div className="expenses-header">
        <div>
          <h1 className="expenses-title">Expenses</h1>
          <p className="expenses-subtitle">Track and manage all business expenses and reimbursements.</p>
        </div>
        <div className="expenses-header-actions">
          <label className="expenses-search">
            <Search size={16} color="#64748b" />
            <input placeholder="Search expenses, merchants, categories..." />
          </label>
          <button type="button" style={toolbarButtonStyle}><Filter size={15} /> Filters</button>
          <button type="button" style={primaryButtonStyle}><Plus size={15} /> New Expense <ChevronDown size={13} /></button>
        </div>
      </div>

      <section className="expenses-metrics">
        {metricCards.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="expenses-card expenses-metric-card">
              <span className="expenses-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={22} /></span>
              <span>
                <span className="expenses-card-label">{metric.title}</span>
                <strong className="expenses-card-value">{metric.value}</strong>
                <small className="expenses-card-detail" style={{ color: metric.up ? '#16a34a' : '#334155' }}>{metric.up ? 'Up ' : ''}{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <nav className="expenses-tabs" aria-label="Expense status filters">
        {expenseTabs.map((tab, index) => (
          <button key={tab} type="button" className={index === 0 ? 'is-active' : undefined}>{tab}</button>
        ))}
      </nav>

      <section className="expenses-table-card">
        <div className="expenses-filterbar">
          <label className="expenses-filter-search"><Search size={15} color="#64748b" /><input placeholder="Search expenses..." /></label>
          <button type="button" className="expenses-filter-button">Category <ChevronDown size={14} /></button>
          <button type="button" className="expenses-filter-button"><CalendarDays size={15} /> Date Range <ChevronDown size={14} /></button>
          <button type="button" className="expenses-filter-button">Payment Method <ChevronDown size={14} /></button>
          <button type="button" className="expenses-filter-button">Employee <ChevronDown size={14} /></button>
          <button type="button" className="expenses-filter-button"><SlidersHorizontal size={15} /> More Filters</button>
          <button type="button" className="expenses-filter-button expenses-export">Export <Download size={14} /></button>
          <button type="button" aria-label="Expense table settings" className="expenses-icon-button"><Settings size={16} /></button>
        </div>

        <div className="expenses-table-wrap">
          <table className="expenses-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all expenses" /></th>
                {['Date', 'Description', 'Category', 'Employee', 'Amount', 'Payment Method', 'Status', 'Receipt', 'Actions'].map(column => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {expenseRecords.map(expense => (
                <tr key={`${expense.date}-${expense.description}`}>
                  <td data-label="Select"><input type="checkbox" aria-label={`Select ${expense.description}`} /></td>
                  <td data-label="Date">{expense.date}</td>
                  <td data-label="Description"><strong>{expense.description}</strong><small>{expense.merchant}</small></td>
                  <td data-label="Category"><ExpenseCategoryPill value={expense.category} /></td>
                  <td data-label="Employee"><strong>{expense.employee}</strong><small>{expense.department}</small></td>
                  <td data-label="Amount"><strong>{formatUsd(expense.amount)}</strong></td>
                  <td data-label="Payment Method"><ExpenseMethodPill value={expense.paymentMethod} /></td>
                  <td data-label="Status"><ExpenseStatusPill value={expense.status} /></td>
                  <td data-label="Receipt"><button type="button" aria-label={`Receipt for ${expense.description}`} className="expenses-icon-button"><Paperclip size={15} /></button></td>
                  <td data-label="Actions"><button type="button" aria-label={`Actions for ${expense.description}`} className="expenses-icon-button"><MoreHorizontal size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="expenses-pagination">
          <strong>Showing 1 to {expenseRecords.length} of {expenseSummary.totalCount} expenses</strong>
          <div>
            {['‹', '1', '2', '3', '4', '5', '...', '16', '›'].map((page, index) => (
              <button key={`${page}-${index}`} type="button" className={page === '1' ? 'is-active' : undefined}>{page}</button>
            ))}
            <button type="button" className="expenses-page-size">10 / page <ChevronDown size={14} /></button>
          </div>
        </div>
      </section>

      <section className="expenses-insights">
        <InsightCard icon={FileText} title="Top Category" value={topCategoryName} detail={`${formatUsd(topCategory[topCategoryName] || 0)} (${(((topCategory[topCategoryName] || 0) / expenseSummary.totalExpenses) * 100).toFixed(1)}%)`} />
        <InsightCard icon={CreditCard} title="Top Merchant" value={topMerchantEntry[0]} detail={formatUsd(topMerchantEntry[1])} />
        <InsightCard icon={ArrowUpRight} title="This Month vs Last Month" value="Up 8.4%" detail={`${formatUsd(expenseSummary.monthTotal)} vs ${formatUsd(expenseSummary.previousMonth)}`} />
        <InsightCard icon={Clock3} title="Avg. Expense per Day" value={formatUsd(averagePerDay)} detail="This month" />
      </section>
    </div>
  )
}

function InsightCard({ icon: Icon, title, value, detail }: { icon: LucideIcon; title: string; value: string; detail: string }) {
  return (
    <div className="expenses-insight-card">
      <span><Icon size={18} /></span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </div>
  )
}

function ExpenseCategoryPill({ value }: { value: ExpenseRecord['category'] }) {
  const styles: Record<ExpenseRecord['category'], { bg: string; color: string }> = {
    'Meals & Entertainment': { bg: '#dcfce7', color: '#15803d' },
    'Office Supplies': { bg: '#dbeafe', color: '#2563eb' },
    Transportation: { bg: '#f3e8ff', color: '#7c3aed' },
    Software: { bg: '#ffedd5', color: '#f97316' },
    'Team Activities': { bg: '#fce7f3', color: '#db2777' },
    Utilities: { bg: '#ccfbf1', color: '#0f766e' },
    Marketing: { bg: '#ffe4e6', color: '#e11d48' },
  }
  return <span className="expenses-pill" style={styles[value]}>{value}</span>
}

function ExpenseMethodPill({ value }: { value: ExpenseRecord['paymentMethod'] }) {
  const styles: Record<ExpenseRecord['paymentMethod'], { bg: string; color: string }> = {
    'Corporate Card': { bg: '#dbeafe', color: '#2563eb' },
    Cash: { bg: '#fff7ed', color: '#d97706' },
    'Bank Transfer': { bg: '#ccfbf1', color: '#0f766e' },
  }
  return <span className="expenses-pill" style={styles[value]}>{value}</span>
}

function ExpenseStatusPill({ value }: { value: ExpenseRecord['status'] }) {
  const styles: Record<ExpenseRecord['status'], { bg: string; color: string }> = {
    'Pending Approval': { bg: '#fff7ed', color: '#d97706' },
    Approved: { bg: '#dcfce7', color: '#15803d' },
    Reimbursed: { bg: '#dbeafe', color: '#2563eb' },
    'To Reimburse': { bg: '#f3e8ff', color: '#7c3aed' },
    Declined: { bg: '#fef2f2', color: '#ef4444' },
  }
  return <span className="expenses-pill" style={styles[value]}>{value}</span>
}

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e8edf4', borderRadius: 8, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }
const toolbarButtonStyle: React.CSSProperties = { minHeight: 38, borderRadius: 8, border: '1px solid #e8edf4', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 12.5, fontWeight: 850, cursor: 'pointer' }
const primaryButtonStyle: React.CSSProperties = { ...toolbarButtonStyle, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', fontWeight: 950 }
const filterInputStyle: React.CSSProperties = { height: 40, borderRadius: 8, border: '1px solid #e8edf4', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 13px' }
const inlineInputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#0f172a', fontSize: 12.5 }
const selectFilterStyle: React.CSSProperties = { minHeight: 40, borderRadius: 8, border: '1px solid #e8edf4', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 12px', fontSize: 12.5, fontWeight: 850, cursor: 'pointer' }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 900 }
const tdStyle: React.CSSProperties = { padding: '14px', fontSize: 13, color: '#334155', verticalAlign: 'middle' }
const tdStrongStyle: React.CSSProperties = { ...tdStyle, color: '#0f172a', fontWeight: 950 }
const tdStatusStyle: React.CSSProperties = { ...tdStyle, fontWeight: 900 }
const moreButtonStyle: React.CSSProperties = { width: 32, height: 30, borderRadius: 7, border: '1px solid #eef2f7', background: '#fff', color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer' }

const expensesResponsiveCss = `
.expenses-page {
  padding: 26px 28px 40px;
  color: #0f172a;
}
.expenses-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}
.expenses-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 950;
}
.expenses-subtitle {
  margin: 8px 0 0;
  color: #334155;
  font-size: 13.5px;
}
.expenses-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.expenses-search,
.expenses-filter-search {
  min-height: 40px;
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  border: 1px solid #e8edf4;
}
.expenses-search {
  width: min(340px, 40vw);
}
.expenses-search input,
.expenses-filter-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12.5px;
  color: #0f172a;
}
.expenses-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(170px, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}
.expenses-card,
.expenses-table-card,
.expenses-insights {
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .03);
}
.expenses-card {
  min-height: 100px;
  padding: 18px;
}
.expenses-metric-card {
  display: flex;
  align-items: center;
}
.expenses-metric-icon {
  width: 54px;
  height: 54px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  margin-right: 16px;
  flex: 0 0 auto;
}
.expenses-card-label,
.expenses-insight-card small {
  display: block;
  color: #475569;
  font-size: 12px;
  font-weight: 850;
}
.expenses-card-value {
  display: block;
  color: #0f172a;
  font-size: 23px;
  margin-top: 8px;
  white-space: nowrap;
}
.expenses-card-detail {
  display: block;
  font-size: 11.5px;
  font-weight: 900;
  margin-top: 8px;
}
.expenses-tabs {
  display: flex;
  align-items: center;
  gap: 30px;
  border-bottom: 1px solid #e8edf4;
  padding-left: 14px;
  overflow-x: auto;
}
.expenses-tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #0f172a;
  min-height: 48px;
  padding: 0;
  font-size: 12.5px;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}
.expenses-tabs button.is-active {
  color: #16a34a;
  border-bottom-color: #16a34a;
}
.expenses-table-card {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  padding: 18px;
}
.expenses-filterbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(5, minmax(140px, auto)) minmax(110px, auto) 42px;
  gap: 14px;
  align-items: center;
  margin-bottom: 18px;
}
.expenses-filter-button,
.expenses-icon-button,
.expenses-pagination button {
  border: 1px solid #e8edf4;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
}
.expenses-filter-button {
  min-height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 850;
  white-space: nowrap;
}
.expenses-export {
  justify-self: end;
}
.expenses-icon-button {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  display: inline-grid;
  place-items: center;
}
.expenses-table-wrap {
  overflow-x: auto;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}
.expenses-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
}
.expenses-table th {
  text-align: left;
  padding: 12px 14px;
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 900;
  background: #f8fafc;
}
.expenses-table td {
  padding: 14px;
  font-size: 13px;
  color: #334155;
  vertical-align: middle;
  border-top: 1px solid #eef2f7;
}
.expenses-table td strong {
  display: block;
  color: #0f172a;
}
.expenses-table td small {
  display: block;
  color: #64748b;
  margin-top: 3px;
}
.expenses-pill {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 6px;
  padding: 0 9px;
  font-size: 11.5px;
  font-weight: 900;
  white-space: nowrap;
}
.expenses-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
}
.expenses-pagination strong {
  font-size: 12.5px;
}
.expenses-pagination > div {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.expenses-pagination button {
  min-width: 34px;
  height: 32px;
  border-radius: 7px;
  font-weight: 900;
}
.expenses-pagination button.is-active {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.expenses-page-size {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  width: auto;
}
.expenses-insights {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  margin-top: 16px;
}
.expenses-insight-card {
  min-height: 82px;
  padding: 18px 22px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  border-right: 1px solid #eef2f7;
}
.expenses-insight-card:last-child {
  border-right: 0;
}
.expenses-insight-card > span {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: #eff6ff;
  color: #2563eb;
  display: grid;
  place-items: center;
}
.expenses-insight-card strong {
  display: block;
  color: #0f172a;
  font-size: 17px;
  margin-top: 4px;
}
.expenses-insight-card em {
  display: block;
  color: #334155;
  font-size: 12px;
  font-style: normal;
  margin-top: 4px;
}
@media (max-width: 1280px) {
  .expenses-page {
    padding: 22px;
  }
  .expenses-header {
    flex-direction: column;
  }
  .expenses-header-actions,
  .expenses-search {
    width: 100%;
  }
  .expenses-metrics {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }
  .expenses-filterbar {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .expenses-export {
    justify-self: stretch;
  }
}
@media (max-width: 920px) {
  .expenses-metrics,
  .expenses-insights,
  .expenses-filterbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .expenses-tabs {
    gap: 22px;
  }
  .expenses-pagination {
    align-items: flex-start;
    flex-direction: column;
  }
  .expenses-insight-card {
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
  }
  .expenses-insight-card:last-child {
    border-bottom: 0;
  }
}
@media (max-width: 640px) {
  .expenses-page {
    padding: 16px;
  }
  .expenses-title {
    font-size: 24px;
  }
  .expenses-header-actions,
  .expenses-metrics,
  .expenses-filterbar,
  .expenses-insights {
    grid-template-columns: 1fr;
  }
  .expenses-header-actions {
    display: grid;
  }
  .expenses-card-value {
    font-size: 21px;
  }
  .expenses-tabs {
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .expenses-table-card {
    padding: 12px;
  }
  .expenses-table-wrap {
    border: 0;
    overflow: visible;
  }
  .expenses-table,
  .expenses-table thead,
  .expenses-table tbody,
  .expenses-table tr,
  .expenses-table td {
    display: block;
    width: 100%;
    min-width: 0;
  }
  .expenses-table thead {
    display: none;
  }
  .expenses-table tr {
    border: 1px solid #eef2f7;
    border-radius: 8px;
    margin-bottom: 12px;
    background: #fff;
    overflow: hidden;
  }
  .expenses-table td {
    border-top: 0;
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 10px;
    padding: 10px 12px;
    font-size: 12.5px;
  }
  .expenses-table td::before {
    content: attr(data-label);
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .expenses-table td[data-label="Select"],
  .expenses-table td[data-label="Receipt"],
  .expenses-table td[data-label="Actions"] {
    grid-template-columns: 110px auto;
  }
  .expenses-pagination > div {
    justify-content: flex-start;
  }
}
`
