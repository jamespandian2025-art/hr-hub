'use client'

import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Download,
  Filter,
  Funnel,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

type SaleStatus = 'Confirmed' | 'Processing' | 'Shipped' | 'Cancelled' | 'Draft'
type SaleStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'

type SalesOrder = {
  id: string
  customer: string
  orderDate: string
  amount: number
  status: SaleStatus
  salesRep: string
  category: string
  stage: SaleStage
}

type Invoice = {
  id: string
  customer: string
  date: string
  amount: number
  status: 'Paid' | 'Pending' | 'Overdue'
}

type FormState = {
  customer: string
  title: string
  amount: string
  orderDate: string
  status: SaleStatus
  salesRep: string
  category: string
  stage: SaleStage
  notes: string
}

const font = 'var(--font-body)'
const green = '#16a34a'
const storageKey = 'flowsys-sales-orders'

const seedOrders: SalesOrder[] = [
  { id: 'SO-2024-0512', customer: 'ABC Corporation', orderDate: 'May 31, 2024', amount: 45000, status: 'Confirmed', salesRep: 'Emily Clark', category: 'Software', stage: 'Won' },
  { id: 'SO-2024-0511', customer: 'Global Industries Ltd.', orderDate: 'May 30, 2024', amount: 32500, status: 'Confirmed', salesRep: 'Michael Smith', category: 'Services', stage: 'Won' },
  { id: 'SO-2024-0510', customer: 'Delta Solutions', orderDate: 'May 29, 2024', amount: 18750, status: 'Processing', salesRep: 'Alex Scott', category: 'Hardware', stage: 'Negotiation' },
  { id: 'SO-2024-0509', customer: 'Summit Enterprises', orderDate: 'May 28, 2024', amount: 27800, status: 'Confirmed', salesRep: 'Robert Brown', category: 'Services', stage: 'Proposal' },
  { id: 'SO-2024-0508', customer: 'TechNova Inc.', orderDate: 'May 27, 2024', amount: 65200, status: 'Shipped', salesRep: 'Emily Clark', category: 'Software', stage: 'Won' },
  { id: 'SO-2024-0507', customer: 'Bright Future Co.', orderDate: 'May 26, 2024', amount: 14600, status: 'Processing', salesRep: 'Jessica White', category: 'Subscription', stage: 'Qualified' },
  { id: 'SO-2024-0506', customer: 'Prime Retailers', orderDate: 'May 25, 2024', amount: 22300, status: 'Cancelled', salesRep: 'Michael Smith', category: 'Hardware', stage: 'Lead' },
]

const seedInvoices: Invoice[] = [
  { id: 'INV-2024-0518', customer: 'ABC Corporation', date: 'May 31, 2024', amount: 45000, status: 'Paid' },
  { id: 'INV-2024-0517', customer: 'Global Industries Ltd.', date: 'May 30, 2024', amount: 32500, status: 'Paid' },
  { id: 'INV-2024-0516', customer: 'Delta Solutions', date: 'May 29, 2024', amount: 18750, status: 'Pending' },
  { id: 'INV-2024-0515', customer: 'Summit Enterprises', date: 'May 28, 2024', amount: 27800, status: 'Overdue' },
]

const emptyForm: FormState = {
  customer: '',
  title: '',
  amount: '',
  orderDate: new Date().toISOString().slice(0, 10),
  status: 'Draft',
  salesRep: '',
  category: '',
  stage: 'Lead',
  notes: '',
}

export default function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>(() => loadOrders())
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(orders))
  }, [orders])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter(order => !query || [order.id, order.customer, order.salesRep, order.category, order.status].join(' ').toLowerCase().includes(query))
  }, [orders, search])

  const summary = useMemo(() => {
    const revenue = orders.filter(order => order.status !== 'Cancelled').reduce((sum, order) => sum + order.amount, 0)
    const customers = new Set(orders.map(order => order.customer)).size
    const averageOrder = revenue / Math.max(orders.filter(order => order.status !== 'Cancelled').length, 1)
    const won = orders.filter(order => order.stage === 'Won').length
    return { revenue, customers, averageOrder, conversion: Math.round((won / Math.max(orders.length, 1)) * 1000) / 10 }
  }, [orders])

  const salesRepTotals = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; deals: number }>()
    orders.forEach(order => {
      const current = map.get(order.salesRep) ?? { name: order.salesRep, amount: 0, deals: 0 }
      current.amount += order.amount
      current.deals += 1
      map.set(order.salesRep, current)
    })
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [orders])

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach(order => {
      if (order.status === 'Cancelled') return
      map.set(order.category, (map.get(order.category) ?? 0) + order.amount)
    })
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }))
  }, [orders])

  const openDrawer = () => {
    setNewMenuOpen(false)
    setDrawerOpen(true)
  }

  const update = (key: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
  }

  const saveSale = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.customer.trim() || !form.amount.trim() || !form.salesRep.trim() || !form.category.trim()) {
      setError('Please complete customer, amount, sales rep, and category before saving.')
      return
    }

    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid sale amount.')
      return
    }

    const nextOrder: SalesOrder = {
      id: `SO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      customer: form.customer.trim(),
      orderDate: formatDate(form.orderDate),
      amount,
      status: form.status,
      salesRep: form.salesRep.trim(),
      category: form.category,
      stage: form.stage,
    }

    setOrders(current => [nextOrder, ...current])
    setForm(emptyForm)
    setDrawerOpen(false)
  }

  return (
    <div style={{ fontFamily: font, display: 'grid', gap: 24, color: '#0f172a' }}>
      <PageHeader
        title="Sales"
        subtitle="Manage leads, opportunities, quotes, orders and track sales performance."
        actions={(
          <>
            <ToolbarButton icon={<CalendarDays size={16} />} label="May 1 - May 31, 2024" hasChevron />
            <ToolbarButton icon={<Filter size={16} />} label="Filters" />
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNewMenuOpen(value => !value)} style={primaryButton}>
                <Plus size={16} /> New <ChevronDown size={14} />
              </button>
              {newMenuOpen ? (
                <div style={newMenu}>
                  <button onClick={openDrawer} style={newMenuItem}><ShoppingBag size={15} /> New sale</button>
                  <button onClick={openDrawer} style={newMenuItem}><UsersRound size={15} /> New lead</button>
                  <button onClick={openDrawer} style={newMenuItem}><ReceiptText size={15} /> New quote</button>
                </div>
              ) : null}
            </div>
            <ToolbarButton icon={<Download size={16} />} label="Export" />
          </>
        )}
      />

      <div style={metricGrid}>
        <MetricCard icon={<CircleDollarSign size={24} />} label="Total Revenue" value={formatMoney(summary.revenue)} detail="+18.6% vs Apr 1 - Apr 30, 2024" tone="#16a34a" />
        <MetricCard icon={<ShoppingBag size={24} />} label="Total Orders" value={orders.length.toString()} detail="+12.4% vs Apr 1 - Apr 30, 2024" tone="#2563eb" />
        <MetricCard icon={<TrendingUp size={24} />} label="Average Order Value" value={formatMoney(summary.averageOrder)} detail="+8.7% vs Apr 1 - Apr 30, 2024" tone="#7c3aed" />
        <MetricCard icon={<UserRound size={24} />} label="Total Customers" value={summary.customers.toString()} detail="+6.3% vs Apr 1 - Apr 30, 2024" tone="#f59e0b" />
        <MetricCard icon={<Funnel size={24} />} label="Conversion Rate" value={`${summary.conversion}%`} detail="+3.2% vs Apr 1 - Apr 30, 2024" tone="#14b8a6" />
      </div>

      <div style={tabs}>
        {['Overview', 'Leads', 'Opportunities', 'Quotes', 'Sales Orders', 'Invoices', 'Customers', 'Products', 'Sales Analytics'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Overview' ? (
        <>
          <div style={topGrid}>
            <Panel title="Sales Performance" action={<select style={miniSelect}><option>By Month</option></select>}>
              <PerformanceChart />
            </Panel>
            <Panel title="Sales Pipeline" action={<select style={miniSelect}><option>This Month</option></select>}>
              <Pipeline />
            </Panel>
            <Panel title="Top Sales Reps" action={<a style={viewAll}>View All</a>}>
              <div style={{ display: 'grid', gap: 14 }}>
                {salesRepTotals.map((rep, index) => <SalesRep key={rep.name} rep={rep} index={index} />)}
              </div>
            </Panel>
          </div>

          <div style={bottomGrid}>
            <Panel title="Recent Sales Orders" action={<SearchFilter search={search} setSearch={setSearch} />}>
              <SalesOrdersTable orders={filteredOrders} />
            </Panel>
            <div style={{ display: 'grid', gap: 16 }}>
              <Panel title="Revenue by Product Category" action={<a style={viewAll}>View All</a>}>
                <CategoryRevenue total={summary.revenue} categories={categoryTotals} />
              </Panel>
              <Panel title="Recent Invoices" action={<a style={viewAll}>View All</a>}>
                <InvoicesTable invoices={seedInvoices} />
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <Panel title={activeTab} action={<SearchFilter search={search} setSearch={setSearch} />}>
          <SalesOrdersTable orders={filteredOrders} />
        </Panel>
      )}

      {drawerOpen ? (
        <div style={overlay}>
          <form onSubmit={saveSale} style={drawer}>
            <div style={drawerHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Add New Sale</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>Create a sales order, lead, quote, or opportunity record.</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} style={iconButton}><X size={18} /></button>
            </div>

            {error ? <div style={errorBox}>{error}</div> : null}

            <div style={formGrid}>
              <TextField label="Customer" required value={form.customer} onChange={value => update('customer', value)} placeholder="Enter customer or company name" />
              <TextField label="Sale Title" value={form.title} onChange={value => update('title', value)} placeholder="Example: Website redesign order" />
              <TextField label="Amount" required value={form.amount} onChange={value => update('amount', value)} placeholder="0.00" prefix="$" type="number" />
              <TextField label="Order Date" value={form.orderDate} onChange={value => update('orderDate', value)} type="date" />
              <SelectField label="Sales Rep" required value={form.salesRep} onChange={value => update('salesRep', value)} options={['Emily Clark', 'Michael Smith', 'Alex Scott', 'Robert Brown', 'Jessica White', 'James Pandian']} />
              <SelectField label="Category" required value={form.category} onChange={value => update('category', value)} options={['Software', 'Services', 'Hardware', 'Subscription']} />
              <SelectField label="Stage" value={form.stage} onChange={value => update('stage', value as SaleStage)} options={['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won']} />
              <SelectField label="Status" value={form.status} onChange={value => update('status', value as SaleStatus)} options={['Draft', 'Processing', 'Confirmed', 'Shipped', 'Cancelled']} />
              <label style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                <span style={labelStyle}>Notes</span>
                <textarea value={form.notes} onChange={event => update('notes', event.target.value)} rows={4} placeholder="Add internal notes..." style={{ ...inputStyle, height: 96, resize: 'vertical' }} />
              </label>
            </div>

            <div style={drawerFooter}>
              <button type="button" onClick={() => setDrawerOpen(false)} style={secondaryButton}>Cancel</button>
              <button type="submit" style={primaryButton}>Save Sale</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function loadOrders() {
  if (typeof window === 'undefined') return seedOrders
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return seedOrders
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : seedOrders
  } catch {
    return seedOrders
  }
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions: ReactNode }) {
  return (
    <div style={pageHeader}>
      <div>
        <h1 style={h1}>{title}</h1>
        <p style={subtitleStyle}>{subtitle}</p>
      </div>
      <div style={actionsWrap}>{actions}</div>
    </div>
  )
}

function MetricCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return (
    <div style={metricCard}>
      <span style={softIcon(tone)}>{icon}</span>
      <div>
        <div style={statLabel}>{label}</div>
        <div style={statValue}>{value}</div>
        <div style={statDetail}><ArrowUpRight size={12} /> {detail}</div>
      </div>
    </div>
  )
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section style={panel}>
      <div style={panelHeader}>
        <h2 style={panelTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function PerformanceChart() {
  const months = [
    { label: "Dec '23", revenue: 38, orders: 44 },
    { label: "Jan '24", revenue: 56, orders: 86 },
    { label: "Feb '24", revenue: 51, orders: 64 },
    { label: "Mar '24", revenue: 60, orders: 65 },
    { label: "Apr '24", revenue: 57, orders: 72 },
    { label: "May '24", revenue: 92, orders: 106 },
  ]

  return (
    <div style={{ padding: '8px 6px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 22, fontSize: 12, color: '#475569', marginBottom: 12 }}>
        <span><i style={legendDot('#16a34a')} /> Revenue (USD)</span>
        <span><i style={legendDot('#2563eb')} /> Orders</span>
      </div>
      <div style={chartArea}>
        {months.map(month => (
          <div key={month.label} style={chartColumn}>
            <div style={{ ...bar, height: `${month.revenue}%` }} />
            <span style={linePoint(month.orders)} />
            <small style={chartLabel}>{month.label}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function Pipeline() {
  const stages = [
    { label: 'Leads', count: 320, amount: 1280000, color: '#2563eb', width: '100%' },
    { label: 'Qualified', count: 180, amount: 860000, color: '#60a5fa', width: '78%' },
    { label: 'Proposal', count: 92, amount: 520000, color: '#8b5cf6', width: '58%' },
    { label: 'Negotiation', count: 48, amount: 320000, color: '#f59e0b', width: '36%' },
    { label: 'Won', count: 28, amount: 210000, color: '#10b981', width: '20%' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 120px', gap: 12, alignItems: 'center' }}>
      {stages.map(stage => (
        <div key={stage.label} style={{ display: 'contents' }}>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}><i style={legendDot(stage.color)} /> {stage.label}<br /><strong style={{ color: '#0f172a' }}>{stage.count}</strong></div>
          <div style={{ display: 'grid', justifyItems: 'center' }}><span style={{ width: stage.width, height: 36, borderRadius: 6, background: stage.color, clipPath: 'polygon(8% 0, 92% 0, 80% 100%, 20% 100%)' }} /></div>
          <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'right' }}>{formatMoney(stage.amount)}</div>
        </div>
      ))}
    </div>
  )
}

function SalesRep({ rep, index }: { rep: { name: string; amount: number; deals: number }; index: number }) {
  const colors = ['#4f46e5', '#f97316', '#ef4444', '#2563eb', '#10b981']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ ...avatarStyle, background: colors[index % colors.length] }}>{initials(rep.name)}</span>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', fontSize: 13 }}>{rep.name}</strong>
        <span style={{ color: '#64748b', fontSize: 12 }}>{formatMoney(rep.amount)}</span>
      </div>
      <span style={dealPill}>{rep.deals} Deals</span>
    </div>
  )
}

function CategoryRevenue({ total, categories }: { total: number; categories: { category: string; amount: number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: 24 }}>
      <div style={donut}>
        <strong>{formatMoney(total)}</strong>
        <span>Total Revenue</span>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {categories.map((category, index) => (
          <div key={category.category} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span><i style={legendDot(['#16a34a', '#2563eb', '#8b5cf6', '#f59e0b'][index % 4])} /> {category.category}</span>
            <strong>{formatMoney(category.amount)} ({Math.round((category.amount / Math.max(total, 1)) * 100)}%)</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function SalesOrdersTable({ orders }: { orders: SalesOrder[] }) {
  if (!orders.length) return <EmptyState message="No sales orders found." />
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={table}>
        <thead>
          <tr>
            {['Order #', 'Customer', 'Order Date', 'Amount', 'Status', 'Sales Rep', ''].map(header => <th key={header} style={th}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td style={td}><strong style={{ color: '#2563eb' }}>{order.id}</strong></td>
              <td style={td}>{order.customer}</td>
              <td style={td}>{order.orderDate}</td>
              <td style={td}>{formatMoney(order.amount)}</td>
              <td style={td}><StatusBadge status={order.status} /></td>
              <td style={td}><span style={{ ...avatarStyle, width: 24, height: 24, fontSize: 10, marginRight: 8 }}>{initials(order.salesRep)}</span>{order.salesRep}</td>
              <td style={td}><button style={iconButton}><MoreHorizontal size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={footer}>Showing 1 to {orders.length} of {orders.length} orders <span style={{ marginLeft: 'auto' }}>10 / page</span></div>
    </div>
  )
}

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <table style={table}>
      <thead><tr>{['Invoice #', 'Customer', 'Date', 'Amount', 'Status'].map(header => <th key={header} style={th}>{header}</th>)}</tr></thead>
      <tbody>
        {invoices.map(invoice => (
          <tr key={invoice.id}>
            <td style={td}><strong>{invoice.id}</strong></td>
            <td style={td}>{invoice.customer}</td>
            <td style={td}>{invoice.date}</td>
            <td style={td}>{formatMoney(invoice.amount)}</td>
            <td style={td}><InvoiceStatusBadge status={invoice.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SearchFilter({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return (
    <label style={searchBox}>
      <Search size={15} color="#64748b" />
      <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search sales..." style={bareInput} />
    </label>
  )
}

function ToolbarButton({ icon, label, hasChevron }: { icon: ReactNode; label: string; hasChevron?: boolean }) {
  return <button style={secondaryButton}>{icon}{label}{hasChevron ? <ChevronDown size={14} /> : null}</button>
}

function TextField({ label, value, onChange, placeholder, required, type = 'text', prefix }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string; prefix?: string }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <span style={{ position: 'relative' }}>
        {prefix ? <span style={prefixStyle}>{prefix}</span> : null}
        <input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingLeft: prefix ? 42 : 12 }} />
      </span>
    </label>
  )
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function StatusBadge({ status }: { status: SaleStatus }) {
  const map: Record<SaleStatus, [string, string]> = {
    Confirmed: ['#dcfce7', '#15803d'],
    Processing: ['#dbeafe', '#1d4ed8'],
    Shipped: ['#ede9fe', '#6d28d9'],
    Cancelled: ['#fee2e2', '#dc2626'],
    Draft: ['#f1f5f9', '#475569'],
  }
  return <span style={badge(map[status])}>{status}</span>
}

function InvoiceStatusBadge({ status }: { status: Invoice['status'] }) {
  const map: Record<Invoice['status'], [string, string]> = {
    Paid: ['#dcfce7', '#15803d'],
    Pending: ['#fef3c7', '#b45309'],
    Overdue: ['#fee2e2', '#dc2626'],
  }
  return <span style={badge(map[status])}>{status}</span>
}

function EmptyState({ message }: { message: string }) {
  return <div style={{ padding: 64, textAlign: 'center', color: '#64748b', fontSize: 13, fontWeight: 700 }}>{message}</div>
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function formatDate(value: string) {
  if (!value) return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

const pageHeader: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }
const h1: CSSProperties = { margin: 0, fontSize: 30, lineHeight: 1.08, fontWeight: 900, color: '#020617', letterSpacing: 0 }
const subtitleStyle: CSSProperties = { margin: '7px 0 0', fontSize: 14, color: '#475569', fontWeight: 500 }
const actionsWrap: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
const metricGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(170px, 1fr))', gap: 16 }
const metricCard: CSSProperties = { minHeight: 118, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 28px rgba(15,23,42,.04)' }
const statLabel: CSSProperties = { color: '#475569', fontSize: 13, fontWeight: 750 }
const statValue: CSSProperties = { color: '#020617', fontSize: 24, fontWeight: 900, marginTop: 6 }
const statDetail: CSSProperties = { color: green, fontSize: 12, fontWeight: 750, marginTop: 8, display: 'flex', alignItems: 'center', gap: 3 }
const tabs: CSSProperties = { display: 'flex', gap: 26, borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }
const topGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '1.45fr 1fr 0.78fr', gap: 16 }
const bottomGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '1.35fr .72fr', gap: 16 }
const panel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,.04)', overflow: 'hidden' }
const panelHeader: CSSProperties = { minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 18px', borderBottom: '1px solid #eef2f7' }
const panelTitle: CSSProperties = { margin: 0, color: '#020617', fontSize: 15, fontWeight: 900 }
const miniSelect: CSSProperties = { height: 34, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 10px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 750 }
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 620 }
const th: CSSProperties = { padding: '13px 14px', color: '#475569', background: '#f8fafc', fontSize: 11, fontWeight: 900, textAlign: 'left', whiteSpace: 'nowrap' }
const td: CSSProperties = { padding: '13px 14px', borderTop: '1px solid #edf2f7', color: '#0f172a', fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }
const footer: CSSProperties = { display: 'flex', padding: '16px 18px', borderTop: '1px solid #edf2f7', color: '#475569', fontSize: 13, fontWeight: 700 }
const viewAll: CSSProperties = { color: '#2563eb', fontSize: 12, fontWeight: 800, textDecoration: 'none' }
const searchBox: CSSProperties = { height: 34, width: 240, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff' }
const bareInput: CSSProperties = { border: 0, outline: 0, minWidth: 0, flex: 1, fontSize: 12, background: 'transparent', color: '#0f172a' }
const primaryButton: CSSProperties = { height: 38, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '0 15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 850, cursor: 'pointer', textDecoration: 'none' }
const secondaryButton: CSSProperties = { height: 38, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', borderRadius: 8, padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }
const iconButton: CSSProperties = { width: 34, height: 34, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', color: '#334155', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const newMenu: CSSProperties = { position: 'absolute', right: 0, top: 44, zIndex: 10, width: 190, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 18px 40px rgba(15,23,42,.16)', padding: 6 }
const newMenuItem: CSSProperties = { width: '100%', border: 0, background: 'transparent', borderRadius: 6, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 9, color: '#0f172a', fontSize: 13, fontWeight: 750, cursor: 'pointer' }
const chartArea: CSSProperties = { height: 230, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, alignItems: 'end', padding: '18px 10px 0', borderBottom: '1px solid #e2e8f0', background: 'repeating-linear-gradient(to top, transparent 0 44px, #eef2f7 45px)' }
const chartColumn: CSSProperties = { height: '100%', display: 'grid', alignItems: 'end', justifyItems: 'center', position: 'relative' }
const bar: CSSProperties = { width: 24, minHeight: 20, borderRadius: '7px 7px 0 0', background: 'linear-gradient(180deg, #22c55e, #15803d)' }
const chartLabel: CSSProperties = { position: 'absolute', bottom: -24, color: '#64748b', fontSize: 11, fontWeight: 700 }
const avatarStyle: CSSProperties = { width: 32, height: 32, borderRadius: 999, background: '#2563eb', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }
const dealPill: CSSProperties = { background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 850 }
const donut: CSSProperties = { width: 156, height: 156, borderRadius: '50%', background: 'conic-gradient(#16a34a 0 40%, #2563eb 40% 70%, #8b5cf6 70% 90%, #f59e0b 90% 100%)', display: 'grid', placeItems: 'center', position: 'relative', color: '#0f172a' }
const overlay: CSSProperties = { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15,23,42,.28)', display: 'flex', justifyContent: 'flex-end' }
const drawer: CSSProperties = { width: 'min(520px, 100vw)', height: '100%', background: '#fff', boxShadow: '-24px 0 50px rgba(15,23,42,.2)', display: 'grid', gridTemplateRows: 'auto 1fr auto', overflowY: 'auto' }
const drawerHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, padding: 28, borderBottom: '1px solid #e2e8f0' }
const formGrid: CSSProperties = { display: 'grid', gap: 16, padding: 28 }
const fieldWrap: CSSProperties = { display: 'grid', gap: 8 }
const labelStyle: CSSProperties = { color: '#334155', fontSize: 13, fontWeight: 850 }
const inputStyle: CSSProperties = { width: '100%', height: 42, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 12px', color: '#0f172a', fontSize: 13, fontWeight: 650, outline: 'none', background: '#fff', boxSizing: 'border-box' }
const prefixStyle: CSSProperties = { position: 'absolute', left: 12, top: 12, color: '#64748b', fontSize: 13, fontWeight: 850 }
const drawerFooter: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 28, borderTop: '1px solid #e2e8f0' }
const errorBox: CSSProperties = { margin: '18px 28px 0', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '11px 13px', fontSize: 13, fontWeight: 800 }

const softIcon = (color: string): CSSProperties => ({
  width: 54,
  height: 54,
  borderRadius: 14,
  background: `${color}16`,
  color,
  display: 'grid',
  placeItems: 'center',
  flex: '0 0 auto',
})

const tabStyle = (active: boolean): CSSProperties => ({
  border: 0,
  background: 'transparent',
  padding: '0 0 13px',
  margin: 0,
  color: active ? green : '#334155',
  borderBottom: active ? `2px solid ${green}` : '2px solid transparent',
  fontSize: 13,
  fontWeight: active ? 900 : 750,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

const badge = ([background, color]: [string, string]): CSSProperties => ({
  background,
  color,
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 850,
})

const legendDot = (color: string): CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: 999,
  background: color,
  display: 'inline-block',
  marginRight: 8,
})

const linePoint = (height: number): CSSProperties => ({
  position: 'absolute',
  bottom: `${height}%`,
  width: 9,
  height: 9,
  borderRadius: 999,
  background: '#2563eb',
  boxShadow: '0 0 0 3px #dbeafe',
})
