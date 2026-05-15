'use client'

import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
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
import { getSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/auth/supabaseClient'

type SaleStatus = 'Confirmed' | 'Processing' | 'Shipped' | 'Cancelled' | 'Draft'
type SaleStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'
type SalesSource = 'supabase' | 'local' | 'unavailable'

type SalesOrder = {
  id: string
  customer: string
  orderDate: string
  amount: number
  status: SaleStatus
  salesRep: string
  category: string
  stage: SaleStage
  title?: string
  notes?: string
  createdAt: string
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
const legacyDemoOrderIds = new Set(['SO-2024-0512', 'SO-2024-0511', 'SO-2024-0510', 'SO-2024-0509', 'SO-2024-0508', 'SO-2024-0507', 'SO-2024-0506'])
const stageOrder: SaleStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won']
const salesStatuses: SaleStatus[] = ['Draft', 'Processing', 'Confirmed', 'Shipped', 'Cancelled']

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
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [source, setSource] = useState<SalesSource>('unavailable')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    loadSalesOrders().then(result => {
      if (!mounted) return
      setOrders(result.orders)
      setSource(result.source)
      setLoadError(result.error || '')
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter(order => !query || [order.id, order.customer, order.salesRep, order.category, order.status, order.stage].join(' ').toLowerCase().includes(query))
  }, [orders, search])

  const invoices = useMemo(() => buildInvoices(orders), [orders])

  const summary = useMemo(() => {
    const validOrders = orders.filter(order => order.status !== 'Cancelled')
    const revenue = validOrders.reduce((sum, order) => sum + order.amount, 0)
    const customers = new Set(validOrders.map(order => order.customer).filter(Boolean)).size
    const averageOrder = revenue / Math.max(validOrders.length, 1)
    const won = orders.filter(order => order.stage === 'Won').length
    return { revenue, customers, averageOrder: validOrders.length ? averageOrder : 0, conversion: orders.length ? Math.round((won / orders.length) * 1000) / 10 : 0 }
  }, [orders])

  const salesRepTotals = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; deals: number }>()
    orders.forEach(order => {
      if (!order.salesRep) return
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
      if (order.status === 'Cancelled' || !order.category) return
      map.set(order.category, (map.get(order.category) ?? 0) + order.amount)
    })
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }))
  }, [orders])

  const pipeline = useMemo(() => stageOrder.map(stage => {
    const stageOrders = orders.filter(order => order.stage === stage)
    return {
      label: stage === 'Lead' ? 'Leads' : stage,
      stage,
      count: stageOrders.length,
      amount: stageOrders.reduce((sum, order) => sum + order.amount, 0),
    }
  }), [orders])

  const monthlyPerformance = useMemo(() => buildMonthlyPerformance(orders), [orders])

  const openDrawer = () => {
    setNewMenuOpen(false)
    setDrawerOpen(true)
  }

  const update = (key: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }))
    setError('')
  }

  const saveSale = async (event: FormEvent<HTMLFormElement>) => {
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
      id: `SO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      customer: form.customer.trim(),
      title: form.title.trim(),
      orderDate: form.orderDate,
      amount,
      status: form.status,
      salesRep: form.salesRep.trim(),
      category: form.category.trim(),
      stage: form.stage,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    }

    setSaving(true)
    const result = await saveSalesOrder(nextOrder)
    setOrders(current => [result.order, ...current.filter(order => order.id !== result.order.id)])
    setSource(result.source)
    setLoadError(result.error || '')
    setSaving(false)
    setForm(emptyForm)
    setDrawerOpen(false)
  }

  const exportSales = () => {
    const rows = orders.map(order => ({
      id: order.id,
      customer: order.customer,
      orderDate: formatDate(order.orderDate),
      amount: order.amount,
      status: order.status,
      salesRep: order.salesRep,
      category: order.category,
      stage: order.stage,
    }))
    const csv = toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sales-orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sales-page" style={{ fontFamily: font, display: 'grid', gap: 24, color: '#0f172a' }}>
      <PageHeader
        title="Sales"
        subtitle="Manage leads, opportunities, quotes, orders and track sales performance."
        actions={(
          <>
            <ToolbarButton icon={<CalendarDays size={16} />} label={currentMonthLabel()} hasChevron />
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
            <button onClick={exportSales} disabled={!orders.length} style={{ ...secondaryButton, opacity: orders.length ? 1 : .55 }}><Download size={16} />Export</button>
          </>
        )}
      />

      <DatabaseStatus loading={loading} source={source} error={loadError} />

      <div style={metricGrid}>
        <MetricCard icon={<CircleDollarSign size={24} />} label="Total Revenue" value={formatMoney(summary.revenue)} detail="From saved sales orders" tone="#16a34a" />
        <MetricCard icon={<ShoppingBag size={24} />} label="Total Orders" value={orders.length.toString()} detail="Saved sales records" tone="#2563eb" />
        <MetricCard icon={<TrendingUp size={24} />} label="Average Order Value" value={formatMoney(summary.averageOrder)} detail="Excludes cancelled orders" tone="#7c3aed" />
        <MetricCard icon={<UserRound size={24} />} label="Total Customers" value={summary.customers.toString()} detail="Unique customers" tone="#f59e0b" />
        <MetricCard icon={<Funnel size={24} />} label="Conversion Rate" value={`${summary.conversion}%`} detail="Won deals over all sales" tone="#14b8a6" />
      </div>

      <div style={tabs}>
        {['Overview', 'Leads', 'Opportunities', 'Quotes', 'Sales Orders', 'Invoices', 'Customers', 'Products', 'Sales Analytics'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Overview' ? (
        <>
          <div className="sales-top-grid" style={topGrid}>
            <Panel title="Sales Performance" action={<select style={miniSelect}><option>By Month</option></select>}>
              <PerformanceChart months={monthlyPerformance} />
            </Panel>
            <Panel title="Sales Pipeline" action={<select style={miniSelect}><option>This Month</option></select>}>
              <Pipeline stages={pipeline} />
            </Panel>
            <Panel title="Top Sales Reps" action={<a style={viewAll}>View All</a>}>
              {salesRepTotals.length ? (
                <div style={{ display: 'grid', gap: 14 }}>
                  {salesRepTotals.map((rep, index) => <SalesRep key={rep.name} rep={rep} index={index} />)}
                </div>
              ) : <EmptyState message="No sales reps yet." compact />}
            </Panel>
          </div>

          <div className="sales-bottom-grid" style={bottomGrid}>
            <Panel title="Recent Sales Orders" action={<SearchFilter search={search} setSearch={setSearch} />}>
              <SalesOrdersTable orders={filteredOrders} />
            </Panel>
            <div className="sales-side-stack" style={{ display: 'grid', gap: 16, minWidth: 0 }}>
              <Panel title="Revenue by Product Category" action={<a style={viewAll}>View All</a>}>
                <CategoryRevenue total={summary.revenue} categories={categoryTotals} />
              </Panel>
              <Panel title="Recent Invoices" action={<a style={viewAll}>View All</a>}>
                <InvoicesTable invoices={invoices} />
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
              <TextField label="Sales Rep" required value={form.salesRep} onChange={value => update('salesRep', value)} placeholder="Enter sales rep name" />
              <TextField label="Category" required value={form.category} onChange={value => update('category', value)} placeholder="Enter product category" />
              <SelectField label="Stage" value={form.stage} onChange={value => update('stage', value as SaleStage)} options={stageOrder} />
              <SelectField label="Status" value={form.status} onChange={value => update('status', value as SaleStatus)} options={salesStatuses} />
              <label style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
                <span style={labelStyle}>Notes</span>
                <textarea value={form.notes} onChange={event => update('notes', event.target.value)} rows={4} placeholder="Add internal notes..." style={{ ...inputStyle, height: 96, resize: 'vertical' }} />
              </label>
            </div>

            <div style={drawerFooter}>
              <button type="button" onClick={() => setDrawerOpen(false)} style={secondaryButton}>Cancel</button>
              <button type="submit" disabled={saving} style={{ ...primaryButton, opacity: saving ? .7 : 1 }}>{saving ? 'Saving...' : 'Save Sale'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

async function loadSalesOrders(): Promise<{ orders: SalesOrder[]; source: SalesSource; error?: string }> {
  const localOrders = loadLocalOrders()
  const supabase = getSupabaseBrowserClient()

  if (!supabase || !hasSupabaseConfig()) {
    return { orders: localOrders, source: localOrders.length ? 'local' : 'unavailable', error: 'Supabase is not configured.' }
  }

  const { data, error } = await supabase
    .from('sales_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { orders: localOrders, source: localOrders.length ? 'local' : 'unavailable', error: error.message }
  }

  const orders = (data || []).map(rowToOrder).filter(isSalesOrder)
  saveLocalOrders(orders)
  return { orders, source: 'supabase' }
}

async function saveSalesOrder(order: SalesOrder): Promise<{ order: SalesOrder; source: SalesSource; error?: string }> {
  const supabase = getSupabaseBrowserClient()

  if (supabase && hasSupabaseConfig()) {
    const { data, error } = await supabase
      .from('sales_orders')
      .upsert(orderToRow(order), { onConflict: 'id' })
      .select()
      .single()

    if (!error && data) {
      const saved = rowToOrder(data)
      upsertLocalOrder(saved)
      return { order: saved, source: 'supabase' }
    }

    upsertLocalOrder(order)
    return { order, source: 'local', error: error?.message || 'Supabase save failed.' }
  }

  upsertLocalOrder(order)
  return { order, source: 'local', error: 'Supabase is not configured.' }
}

function loadLocalOrders() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]') as unknown[]
    const orders = Array.isArray(parsed) ? parsed.filter(isSalesOrder).filter(order => !legacyDemoOrderIds.has(order.id)) : []
    if (Array.isArray(parsed) && orders.length !== parsed.length) saveLocalOrders(orders)
    return orders
  } catch {
    return []
  }
}

function saveLocalOrders(orders: SalesOrder[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(orders))
}

function upsertLocalOrder(order: SalesOrder) {
  const orders = loadLocalOrders()
  saveLocalOrders([order, ...orders.filter(item => item.id !== order.id)])
}

function rowToOrder(row: Record<string, unknown>): SalesOrder {
  return {
    id: stringValue(row.id),
    customer: stringValue(row.customer),
    title: stringValue(row.title),
    orderDate: stringValue(row.order_date, new Date().toISOString().slice(0, 10)),
    amount: numberValue(row.amount),
    status: statusValue(row.status),
    salesRep: stringValue(row.sales_rep),
    category: stringValue(row.category),
    stage: stageValue(row.stage),
    notes: stringValue(row.notes),
    createdAt: stringValue(row.created_at, new Date().toISOString()),
  }
}

function orderToRow(order: SalesOrder) {
  return {
    id: order.id,
    customer: order.customer,
    title: order.title || null,
    order_date: order.orderDate,
    amount: order.amount,
    status: order.status,
    sales_rep: order.salesRep,
    category: order.category,
    stage: order.stage,
    notes: order.notes || null,
    created_at: order.createdAt,
  }
}

function isSalesOrder(value: unknown): value is SalesOrder {
  if (!value || typeof value !== 'object') return false
  const order = value as Partial<SalesOrder>
  return typeof order.id === 'string' &&
    typeof order.customer === 'string' &&
    typeof order.orderDate === 'string' &&
    typeof order.amount === 'number' &&
    salesStatuses.includes(order.status as SaleStatus) &&
    stageOrder.includes(order.stage as SaleStage)
}

function DatabaseStatus({ source, error, loading }: { source: SalesSource; error?: string; loading: boolean }) {
  if (loading) return <div style={infoBox}>Checking sales database...</div>
  if (source === 'supabase') return <div style={successBox}>Sales database connected.</div>
  if (source === 'local') return <div style={infoBox}>Using locally saved sales records. Supabase is not available: {error}</div>
  return <div style={warningBox}>No sales records yet. Supabase is not available: {error || 'sales_orders table not found'}</div>
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
      <div style={{ minWidth: 0 }}>
        <div style={statLabel}>{label}</div>
        <div style={statValue}>{value}</div>
        <div style={statDetail}>{detail}</div>
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

function PerformanceChart({ months }: { months: { label: string; revenue: number; orders: number }[] }) {
  const hasData = months.some(month => month.revenue > 0 || month.orders > 0)
  if (!hasData) return <EmptyState message="Sales performance will appear after orders are created." compact />

  return (
    <div style={{ padding: '8px 6px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 22, fontSize: 12, color: '#475569', marginBottom: 12, flexWrap: 'wrap' }}>
        <span><i style={legendDot('#16a34a')} /> Revenue</span>
        <span><i style={legendDot('#2563eb')} /> Orders</span>
      </div>
      <div style={chartArea}>
        {months.map(month => (
          <div key={month.label} style={chartColumn}>
            <div style={{ ...bar, height: `${Math.max(month.revenue, 8)}%` }} />
            <span style={linePoint(Math.max(month.orders, 8))} />
            <small style={chartLabel}>{month.label}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function Pipeline({ stages }: { stages: { label: string; stage: SaleStage; count: number; amount: number }[] }) {
  const maxAmount = Math.max(...stages.map(stage => stage.amount), 1)
  if (!stages.some(stage => stage.count > 0)) return <EmptyState message="Pipeline stages will appear after sales records are added." compact />

  return (
    <div className="sales-pipeline" style={{ display: 'grid', gridTemplateColumns: 'minmax(92px, 120px) minmax(80px, 1fr) minmax(100px, 120px)', gap: 12, alignItems: 'center', padding: '8px 0' }}>
      {stages.map((stage, index) => {
        const color = ['#2563eb', '#60a5fa', '#8b5cf6', '#f59e0b', '#10b981'][index]
        const width = `${Math.max((stage.amount / maxAmount) * 100, 18)}%`
        return (
          <div className="sales-pipeline-row" key={stage.stage} style={{ display: 'contents' }}>
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}><i style={legendDot(color)} /> {stage.label}<br /><strong style={{ color: '#0f172a' }}>{stage.count}</strong></div>
            <div style={{ display: 'grid', justifyItems: 'center' }}><span style={{ width, height: 36, borderRadius: 6, background: color, clipPath: 'polygon(8% 0, 92% 0, 80% 100%, 20% 100%)' }} /></div>
            <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'right' }}>{formatMoney(stage.amount)}</div>
          </div>
        )
      })}
    </div>
  )
}

function SalesRep({ rep, index }: { rep: { name: string; amount: number; deals: number }; index: number }) {
  const colors = ['#4f46e5', '#f97316', '#ef4444', '#2563eb', '#10b981']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      <span style={{ ...avatarStyle, background: colors[index % colors.length] }}>{initials(rep.name)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 13 }}>{rep.name}</strong>
        <span style={{ color: '#64748b', fontSize: 12 }}>{formatMoney(rep.amount)}</span>
      </div>
      <span style={dealPill}>{rep.deals} Deals</span>
    </div>
  )
}

function CategoryRevenue({ total, categories }: { total: number; categories: { category: string; amount: number }[] }) {
  if (!categories.length) return <EmptyState message="Revenue by category will appear after orders are created." compact />

  return (
    <div className="category-revenue" style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', alignItems: 'center', gap: 22, padding: 18 }}>
      <div style={donut}>
        <strong>{formatMoney(total)}</strong>
        <span>Total Revenue</span>
      </div>
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        {categories.map((category, index) => (
          <div key={category.category} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, minWidth: 0 }}>
            <span><i style={legendDot(['#16a34a', '#2563eb', '#8b5cf6', '#f59e0b'][index % 4])} /> {category.category}</span>
            <strong>{formatMoney(category.amount)} ({Math.round((category.amount / Math.max(total, 1)) * 100)}%)</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function SalesOrdersTable({ orders }: { orders: SalesOrder[] }) {
  if (!orders.length) return <EmptyState message="No sales orders yet." />
  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
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
              <td style={td}>{formatDate(order.orderDate)}</td>
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
  if (!invoices.length) return <EmptyState message="No invoices yet." compact />
  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
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
    </div>
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

function EmptyState({ message, compact }: { message: string; compact?: boolean }) {
  return <div style={{ padding: compact ? '38px 18px' : 64, textAlign: 'center', color: '#64748b', fontSize: 13, fontWeight: 700 }}>{message}</div>
}

function buildInvoices(orders: SalesOrder[]): Invoice[] {
  return orders
    .filter(order => order.status === 'Confirmed' || order.status === 'Shipped' || order.status === 'Processing')
    .slice(0, 5)
    .map(order => ({
      id: order.id.replace(/^SO-/, 'INV-'),
      customer: order.customer,
      date: formatDate(order.orderDate),
      amount: order.amount,
      status: order.status === 'Processing' ? 'Pending' : 'Paid',
    }))
}

function buildMonthlyPerformance(orders: SalesOrder[]) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' })
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: formatter.format(date), revenue: 0, orders: 0 }
  })
  const byKey = new Map(months.map(month => [month.key, month]))

  orders.forEach(order => {
    const date = new Date(order.orderDate)
    if (Number.isNaN(date.getTime())) return
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const month = byKey.get(key)
    if (!month) return
    month.orders += 1
    if (order.status !== 'Cancelled') month.revenue += order.amount
  })

  const maxRevenue = Math.max(...months.map(month => month.revenue), 1)
  const maxOrders = Math.max(...months.map(month => month.orders), 1)
  return months.map(month => ({ label: month.label, revenue: Math.round((month.revenue / maxRevenue) * 100), orders: Math.round((month.orders / maxOrders) * 100) }))
}

function currentMonthLabel() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const month = first.toLocaleDateString('en-US', { month: 'short' })
  return `${month} ${first.getDate()} - ${month} ${last.getDate()}, ${now.getFullYear()}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function formatDate(value: string) {
  if (!value) return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'SR'
}

function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [headers.join(','), ...rows.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(','))].join('\n')
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function statusValue(value: unknown): SaleStatus {
  return salesStatuses.includes(value as SaleStatus) ? value as SaleStatus : 'Draft'
}

function stageValue(value: unknown): SaleStage {
  return stageOrder.includes(value as SaleStage) ? value as SaleStage : 'Lead'
}

const pageHeader: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', minWidth: 0 }
const h1: CSSProperties = { margin: 0, fontSize: 30, lineHeight: 1.08, fontWeight: 900, color: '#020617', letterSpacing: 0 }
const subtitleStyle: CSSProperties = { margin: '7px 0 0', fontSize: 14, color: '#475569', fontWeight: 500 }
const actionsWrap: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
const metricGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, minWidth: 0 }
const metricCard: CSSProperties = { minHeight: 118, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 28px rgba(15,23,42,.04)', minWidth: 0 }
const statLabel: CSSProperties = { color: '#475569', fontSize: 13, fontWeight: 750 }
const statValue: CSSProperties = { color: '#020617', fontSize: 24, fontWeight: 900, marginTop: 6, whiteSpace: 'normal', overflowWrap: 'anywhere' }
const statDetail: CSSProperties = { color: green, fontSize: 12, fontWeight: 750, marginTop: 8, display: 'flex', alignItems: 'center', gap: 3 }
const tabs: CSSProperties = { display: 'flex', gap: 26, borderBottom: '1px solid #e2e8f0', overflowX: 'auto', minWidth: 0 }
const topGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, .95fr) minmax(250px, .78fr)', gap: 16, minWidth: 0 }
const bottomGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, .72fr)', gap: 16, minWidth: 0 }
const panel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,.04)', overflow: 'hidden', minWidth: 0 }
const panelHeader: CSSProperties = { minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 18px', borderBottom: '1px solid #eef2f7', minWidth: 0 }
const panelTitle: CSSProperties = { margin: 0, color: '#020617', fontSize: 15, fontWeight: 900 }
const miniSelect: CSSProperties = { height: 34, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 10px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 750 }
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 700 }
const th: CSSProperties = { padding: '13px 14px', color: '#475569', background: '#f8fafc', fontSize: 11, fontWeight: 900, textAlign: 'left', whiteSpace: 'nowrap' }
const td: CSSProperties = { padding: '13px 14px', borderTop: '1px solid #edf2f7', color: '#0f172a', fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }
const footer: CSSProperties = { display: 'flex', padding: '16px 18px', borderTop: '1px solid #edf2f7', color: '#475569', fontSize: 13, fontWeight: 700, minWidth: 0 }
const viewAll: CSSProperties = { color: '#2563eb', fontSize: 12, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }
const searchBox: CSSProperties = { height: 34, width: 'min(240px, 48vw)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff' }
const bareInput: CSSProperties = { border: 0, outline: 0, minWidth: 0, flex: 1, fontSize: 12, background: 'transparent', color: '#0f172a' }
const primaryButton: CSSProperties = { height: 38, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '0 15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 850, cursor: 'pointer', textDecoration: 'none' }
const secondaryButton: CSSProperties = { height: 38, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', borderRadius: 8, padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }
const iconButton: CSSProperties = { width: 34, height: 34, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', color: '#334155', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const newMenu: CSSProperties = { position: 'absolute', right: 0, top: 44, zIndex: 10, width: 190, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 18px 40px rgba(15,23,42,.16)', padding: 6 }
const newMenuItem: CSSProperties = { width: '100%', border: 0, background: 'transparent', borderRadius: 6, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 9, color: '#0f172a', fontSize: 13, fontWeight: 750, cursor: 'pointer' }
const chartArea: CSSProperties = { height: 230, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(34px, 1fr))', gap: 16, alignItems: 'end', padding: '18px 10px 0', borderBottom: '1px solid #e2e8f0', background: 'repeating-linear-gradient(to top, transparent 0 44px, #eef2f7 45px)', overflowX: 'auto' }
const chartColumn: CSSProperties = { height: '100%', display: 'grid', alignItems: 'end', justifyItems: 'center', position: 'relative' }
const bar: CSSProperties = { width: 24, minHeight: 20, borderRadius: '7px 7px 0 0', background: 'linear-gradient(180deg, #22c55e, #15803d)' }
const chartLabel: CSSProperties = { position: 'absolute', bottom: -24, color: '#64748b', fontSize: 11, fontWeight: 700 }
const avatarStyle: CSSProperties = { width: 32, height: 32, borderRadius: 999, background: '#2563eb', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flex: '0 0 auto' }
const dealPill: CSSProperties = { background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 850, whiteSpace: 'nowrap' }
const donut: CSSProperties = { width: 140, height: 140, borderRadius: '50%', background: 'conic-gradient(#16a34a 0 40%, #2563eb 40% 70%, #8b5cf6 70% 90%, #f59e0b 90% 100%)', display: 'grid', placeItems: 'center', position: 'relative', color: '#0f172a', textAlign: 'center', fontSize: 12 }
const overlay: CSSProperties = { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15,23,42,.28)', display: 'flex', justifyContent: 'flex-end' }
const drawer: CSSProperties = { width: 'min(520px, 100vw)', height: '100%', background: '#fff', boxShadow: '-24px 0 50px rgba(15,23,42,.2)', display: 'grid', gridTemplateRows: 'auto 1fr auto', overflowY: 'auto' }
const drawerHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, padding: 28, borderBottom: '1px solid #e2e8f0' }
const formGrid: CSSProperties = { display: 'grid', gap: 16, padding: 28 }
const fieldWrap: CSSProperties = { display: 'grid', gap: 8, minWidth: 0 }
const labelStyle: CSSProperties = { color: '#334155', fontSize: 13, fontWeight: 850 }
const inputStyle: CSSProperties = { width: '100%', height: 42, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 12px', color: '#0f172a', fontSize: 13, fontWeight: 650, outline: 'none', background: '#fff', boxSizing: 'border-box' }
const prefixStyle: CSSProperties = { position: 'absolute', left: 12, top: 12, color: '#64748b', fontSize: 13, fontWeight: 850 }
const drawerFooter: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 28, borderTop: '1px solid #e2e8f0' }
const errorBox: CSSProperties = { margin: '18px 28px 0', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '11px 13px', fontSize: 13, fontWeight: 800 }
const statusBox: CSSProperties = { borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 800 }
const successBox: CSSProperties = { ...statusBox, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534' }
const infoBox: CSSProperties = { ...statusBox, border: '1px solid #dbe3ea', background: '#f8fafc', color: '#334155' }
const warningBox: CSSProperties = { ...statusBox, border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412' }

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
