'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock3,
  FilePlus2,
  FileText,
  Filter,
  MoreHorizontal,
  PackagePlus,
  PieChart,
  ReceiptText,
  ShoppingCart,
  Truck,
  Upload,
  UsersRound,
} from 'lucide-react'

const font = "var(--font-body)"
const suppliersKey = 'flowsys-suppliers'
const pricebookKey = 'flowsys-pricebook-items'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'
const purchaseRequestsKey = 'flowsys-procurement-purchase-requests'
const rfqsKey = 'flowsys-procurement-rfqs'
const receivingKey = 'flowsys-procurement-receiving'

type SupplierRecord = {
  id?: string | number
  name?: string
  status?: string
}

type PricebookRecord = {
  id?: string | number
  name?: string
  status?: string
}

type PurchaseOrderRecord = {
  id?: string | number
  poNumber?: string
  supplier?: string
  supplierName?: string
  status?: string
  total?: number | string
  amount?: number | string
  grandTotal?: number | string
  createdAt?: string
  date?: string
  leadTimeDays?: number | string
}

type PurchaseRequestRecord = {
  id?: string | number
  requestNo?: string
  requester?: string
  status?: string
  priority?: string
  total?: number | string
  amount?: number | string
  createdAt?: string
  date?: string
}

type RfqRecord = {
  id?: string | number
  status?: string
  expiresAt?: string
  validUntil?: string
}

type ReceivingRecord = {
  id?: string | number
  status?: string
  leadTimeDays?: number | string
}

type ProcurementState = {
  suppliers: SupplierRecord[]
  pricebook: PricebookRecord[]
  purchaseOrders: PurchaseOrderRecord[]
  purchaseRequests: PurchaseRequestRecord[]
  rfqs: RfqRecord[]
  receiving: ReceivingRecord[]
}

const emptyProcurement: ProcurementState = {
  suppliers: [],
  pricebook: [],
  purchaseOrders: [],
  purchaseRequests: [],
  rfqs: [],
  receiving: [],
}

export default function ProcurementOverviewPage() {
  const [data, setData] = useState<ProcurementState>(emptyProcurement)
  const dateRangeLabel = useMemo(() => currentMonthRangeLabel(), [])

  useEffect(() => {
    const loadData = () => {
      setData({
        suppliers: readStored<SupplierRecord>(suppliersKey),
        pricebook: readStored<PricebookRecord>(pricebookKey),
        purchaseOrders: readStored<PurchaseOrderRecord>(purchaseOrdersKey),
        purchaseRequests: readStored<PurchaseRequestRecord>(purchaseRequestsKey),
        rfqs: readStored<RfqRecord>(rfqsKey),
        receiving: readStored<ReceivingRecord>(receivingKey),
      })
    }

    loadData()
    window.addEventListener('storage', loadData)
    window.addEventListener('focus', loadData)
    return () => {
      window.removeEventListener('storage', loadData)
      window.removeEventListener('focus', loadData)
    }
  }, [])

  const stats = useMemo(() => {
    const totalSpend = data.purchaseOrders.reduce((sum, order) => sum + moneyValue(order.grandTotal ?? order.total ?? order.amount), 0)
    const pendingRequests = data.purchaseRequests.filter(request => isPendingStatus(request.status)).length
    const activeSuppliers = data.suppliers.filter(supplier => !supplier.status || supplier.status.toLowerCase() !== 'inactive').length
    const leadTimes = [
      ...data.purchaseOrders.map(order => numberValue(order.leadTimeDays)),
      ...data.receiving.map(item => numberValue(item.leadTimeDays)),
    ].filter(value => value > 0)
    const avgLeadTime = leadTimes.length ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length : 0
    const lowStockItems = data.pricebook.filter(item => item.status?.toLowerCase().includes('low')).length
    const overdueDeliveries = data.receiving.filter(item => item.status?.toLowerCase().includes('overdue')).length
    const priceChanges = data.pricebook.filter(item => item.status?.toLowerCase().includes('price')).length
    const expiringQuotations = data.rfqs.filter(rfq => isExpiringSoon(rfq.expiresAt || rfq.validUntil)).length

    return { totalSpend, pendingRequests, activeSuppliers, avgLeadTime, lowStockItems, overdueDeliveries, priceChanges, expiringQuotations }
  }, [data])

  const topSuppliers = useMemo(() => {
    const totals = new Map<string, number>()
    data.purchaseOrders.forEach(order => {
      const supplier = (order.supplierName || order.supplier || '').trim()
      const total = moneyValue(order.grandTotal ?? order.total ?? order.amount)
      if (supplier && total > 0) totals.set(supplier, (totals.get(supplier) || 0) + total)
    })
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [data.purchaseOrders])

  const hasPurchaseOrders = data.purchaseOrders.length > 0
  const hasPurchaseRequests = data.purchaseRequests.length > 0
  const hasSpend = stats.totalSpend > 0
  const hasSuppliersBySpend = topSuppliers.length > 0

  return (
    <div style={{ padding: '28px 28px 42px', fontFamily: font }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 13, marginBottom: 8 }}>
            <span>Procurement</span>
            <span>/</span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>Overview</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
              <ShoppingCart size={20} />
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, color: '#0f172a', letterSpacing: '-0.02em' }}>Procurement Overview</h1>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Monitor purchasing performance, track orders, and manage supplier relationships.</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" style={toolbarButtonStyle}>{dateRangeLabel} <CalendarDays size={15} /></button>
          <button type="button" style={toolbarButtonStyle}><Filter size={15} /> Filters</button>
          <button type="button" aria-label="More options" style={iconToolbarButtonStyle}><MoreHorizontal size={18} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(150px, 1fr)) 280px', gap: 16, alignItems: 'stretch' }}>
        <MetricCard title="Total Spend" value={formatCurrency(stats.totalSpend)} empty={stats.totalSpend === 0} icon={ReceiptText} tone="green" />
        <MetricCard title="Purchase Orders" value={String(data.purchaseOrders.length)} empty={data.purchaseOrders.length === 0} icon={FileText} tone="blue" />
        <MetricCard title="Pending Requests" value={String(stats.pendingRequests)} empty={stats.pendingRequests === 0} icon={FilePlus2} tone="purple" />
        <MetricCard title="Active Suppliers" value={String(stats.activeSuppliers)} empty={stats.activeSuppliers === 0} icon={UsersRound} tone="green" />
        <MetricCard title="Avg. Lead Time" value={stats.avgLeadTime ? `${stats.avgLeadTime.toFixed(1)} days` : '0'} empty={stats.avgLeadTime === 0} icon={Clock3} tone="orange" />
        <SideCard title="Recent Activities" action="View all">
          <EmptyState icon={BellIcon} title="No activities yet" body="Activities will appear here once there is procurement activity." compact />
        </SideCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 16, marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 16 }}>
            <Panel title="Spend Overview" action={<button type="button" style={smallSelectStyle}>Monthly</button>}>
              {hasSpend ? (
                <MiniSummary label="Total Spend" value={formatCurrency(stats.totalSpend)} href="/procurement/purchase-orders" link="View full report" />
              ) : (
                <EmptyState icon={BarChart3} title="No spend data yet" body="Spend data will appear here once purchase orders are created." action="View report" href="/procurement/purchase-orders" />
              )}
            </Panel>
            <Panel title="Spend by Category">
              <EmptyState icon={PieChart} title="No category data yet" body="Category breakdown will appear here once you have spend data." action="View all categories" href="/resources/pricebook" />
            </Panel>
            <Panel title="PO Status">
              {hasPurchaseOrders ? (
                <StatusList records={data.purchaseOrders.map(order => order.status || 'Draft')} />
              ) : (
                <EmptyState icon={ShoppingCart} title="No purchase orders yet" body="Purchase order status summary will appear here." action="View all purchase orders" href="/procurement/purchase-orders" />
              )}
            </Panel>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Panel title="Recent Purchase Orders" action={<Link href="/procurement/purchase-orders" style={viewAllStyle}>View all</Link>}>
              {hasPurchaseOrders ? <OrderList orders={data.purchaseOrders.slice(0, 5)} /> : <EmptyState icon={FileText} title="No purchase orders yet" body="Your recent purchase orders will appear here." compact />}
            </Panel>
            <Panel title="Pending Requests" action={<Link href="/procurement/purchase-requests" style={viewAllStyle}>View all</Link>}>
              {hasPurchaseRequests ? <RequestList requests={data.purchaseRequests.filter(request => isPendingStatus(request.status)).slice(0, 5)} /> : <EmptyState icon={Clock3} title="No pending requests" body="Pending purchase requests will appear here." compact />}
            </Panel>
          </div>

          <Panel title="Alerts & Insights">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
              <InsightCard icon={AlertTriangle} title="Low Stock Items" value={`${stats.lowStockItems} items`} body={stats.lowStockItems ? 'Needs attention' : 'No items to reorder'} href="/resources/inventory" link="View items" tone="orange" />
              <InsightCard icon={Truck} title="Overdue Deliveries" value={`${stats.overdueDeliveries} orders`} body={stats.overdueDeliveries ? 'Require attention' : 'No overdue deliveries'} href="/procurement/receiving" link="View orders" tone="purple" />
              <InsightCard icon={BarChart3} title="Price Changes" value={`${stats.priceChanges} items`} body={stats.priceChanges ? 'Updated recently' : 'No price changes'} href="/resources/pricebook" link="View changes" tone="green" />
              <InsightCard icon={Clock3} title="Expiring Quotations" value={`${stats.expiringQuotations} quotes`} body={stats.expiringQuotations ? 'Expiring soon' : 'No expiring quotes'} href="/procurement/rfqs" link="View quotes" tone="slate" />
            </div>
          </Panel>
        </div>

        <div style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>
          <SideCard title="Quick Actions">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <QuickAction href="/procurement/purchase-requests" icon={FilePlus2} label="New Purchase Request" />
              <QuickAction href="/procurement/purchase-orders" icon={FileText} label="New Purchase Order" />
              <QuickAction href="/procurement/rfqs" icon={ReceiptText} label="New RFQ / Quotation" />
              <QuickAction href="/resources/pricebook" icon={PackagePlus} label="Add New Item" />
              <QuickAction href="/supplier-database" icon={UsersRound} label="Add New Supplier" />
              <QuickAction href="/resources/pricebook" icon={Upload} label="Import Items" />
            </div>
          </SideCard>

          <SideCard title="Top Suppliers by Spend" action="View all">
            {hasSuppliersBySpend ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {topSuppliers.map(([supplier, total]) => (
                  <div key={supplier} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{supplier}</span>
                    <span style={{ color: '#16a34a', fontWeight: 800 }}>{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={UsersRound} title="No supplier data yet" body="Top suppliers by spend will appear here." compact />
            )}
          </SideCard>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, empty, icon: Icon, tone }: { title: string; value: string; empty: boolean; icon: React.ComponentType<IconProps>; tone: keyof typeof tones }) {
  const color = tones[tone]
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <span style={{ width: 48, height: 48, borderRadius: 13, background: color.bg, color: color.text, display: 'grid', placeItems: 'center' }}><Icon size={22} /></span>
        <div>
          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>{title}</div>
          <div style={{ color: '#0f172a', fontSize: 24, fontWeight: 850, marginTop: 5, lineHeight: 1 }}>{value}</div>
          <div style={{ color: empty ? '#64748b' : '#16a34a', fontSize: 12, marginTop: 8 }}>{empty ? 'No data yet' : 'From saved records'}</div>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 850, color: '#0f172a' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SideCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 850, color: '#0f172a' }}>{title}</h2>
        {action && <span style={{ color: '#2563eb', fontSize: 12, fontWeight: 800 }}>{action}</span>}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ icon: Icon, title, body, action, href, compact = false }: { icon: React.ComponentType<IconProps>; title: string; body: string; action?: string; href?: string; compact?: boolean }) {
  const content = (
    <div style={{ minHeight: compact ? 126 : 210, display: 'grid', placeItems: 'center', textAlign: 'center', padding: compact ? '14px 6px' : '24px 12px' }}>
      <div>
        <span style={{ width: compact ? 64 : 78, height: compact ? 64 : 78, borderRadius: 999, background: '#f1f5f9', color: '#94a3b8', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
          <Icon size={compact ? 30 : 36} />
        </span>
        <div style={{ fontSize: 14, fontWeight: 850, color: '#0f172a' }}>{title}</div>
        <p style={{ margin: '8px auto 0', maxWidth: 250, fontSize: 12, lineHeight: 1.55, color: '#64748b' }}>{body}</p>
        {action && href && (
          <Link href={href} style={{ ...emptyActionStyle, marginTop: 16 }}>
            {action} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  )
  return content
}

function MiniSummary({ label, value, link, href }: { label: string; value: string; link: string; href: string }) {
  return (
    <div style={{ minHeight: 210, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#0f172a', fontSize: 22, fontWeight: 850, marginTop: 4 }}>{value}</div>
      <Link href={href} style={inlineLinkStyle}>{link} <ArrowRight size={14} /></Link>
    </div>
  )
}

function StatusList({ records }: { records: string[] }) {
  const counts = records.reduce<Record<string, number>>((acc, status) => {
    const key = status || 'Draft'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  return (
    <div style={{ display: 'grid', gap: 11, minHeight: 210, alignContent: 'center' }}>
      {Object.entries(counts).map(([status, count]) => (
        <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#475569', fontWeight: 700 }}>{status}</span>
          <span style={{ color: '#0f172a', fontWeight: 850 }}>{count}</span>
        </div>
      ))}
    </div>
  )
}

function OrderList({ orders }: { orders: PurchaseOrderRecord[] }) {
  return <RecordList items={orders.map(order => ({
    id: String(order.poNumber || order.id || 'PO'),
    title: order.supplierName || order.supplier || 'Purchase order',
    meta: order.status || 'Draft',
    total: formatCurrency(moneyValue(order.grandTotal ?? order.total ?? order.amount)),
  }))} />
}

function RequestList({ requests }: { requests: PurchaseRequestRecord[] }) {
  return <RecordList items={requests.map(request => ({
    id: String(request.requestNo || request.id || 'PR'),
    title: request.requester || 'Purchase request',
    meta: request.priority || request.status || 'Pending',
    total: formatCurrency(moneyValue(request.total ?? request.amount)),
  }))} />
}

function RecordList({ items }: { items: Array<{ id: string; title: string; meta: string; total: string }> }) {
  return (
    <div style={{ display: 'grid', gap: 11 }}>
      {items.map(item => (
        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr) auto', gap: 12, alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: '#2563eb', fontWeight: 850 }}>{item.id}</span>
          <span style={{ color: '#0f172a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
          <span style={{ color: '#0f172a', fontWeight: 850 }}>{item.total}</span>
          <span style={{ gridColumn: '2 / span 1', color: '#64748b' }}>{item.meta}</span>
        </div>
      ))}
    </div>
  )
}

function InsightCard({ icon: Icon, title, value, body, href, link, tone }: { icon: React.ComponentType<IconProps>; title: string; value: string; body: string; href: string; link: string; tone: keyof typeof tones }) {
  const color = tones[tone]
  return (
    <div style={{ border: '1px solid #eef2f7', borderRadius: 12, padding: 16, background: '#fff' }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: color.bg, color: color.text, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
        <Icon size={20} />
      </span>
      <div style={{ color: '#0f172a', fontSize: 12, fontWeight: 850 }}>{title}</div>
      <div style={{ color: '#0f172a', fontSize: 18, fontWeight: 850, marginTop: 5 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{body}</div>
      <Link href={href} style={inlineLinkStyle}>{link} <ArrowRight size={14} /></Link>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<IconProps>; label: string }) {
  return (
    <Link href={href} style={{ minHeight: 70, border: '1px solid #eef2f7', borderRadius: 10, textDecoration: 'none', color: '#0f172a', display: 'grid', placeItems: 'center', gap: 5, textAlign: 'center', padding: 10, fontSize: 11, fontWeight: 800, background: '#fff' }}>
      <Icon size={18} color="#2563eb" />
      {label}
    </Link>
  )
}

function BellIcon({ size = 24 }: { size?: number }) {
  return <Clock3 size={size} />
}

type IconProps = {
  size?: number
  color?: string
}

function readStored<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(value) ? (value as T[]) : []
  } catch {
    return []
  }
}

function currentMonthRangeLabel() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start)
  return `${month} ${start.getDate()} - ${month} ${end.getDate()}, ${today.getFullYear()}`
}

function moneyValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function isPendingStatus(status?: string) {
  const normalized = (status || '').toLowerCase()
  return !normalized || normalized.includes('pending') || normalized.includes('open') || normalized.includes('review') || normalized.includes('draft')
}

function isExpiringSoon(value?: string) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  const ms = date.getTime() - now.getTime()
  return ms >= 0 && ms <= 1000 * 60 * 60 * 24 * 14
}

function formatCurrency(value: number) {
  if (!value) return '0'
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value).replace('PHP', 'Php')
}

const tones = {
  green: { bg: '#dcfce7', text: '#16a34a' },
  blue: { bg: '#dbeafe', text: '#2563eb' },
  purple: { bg: '#f3e8ff', text: '#7c3aed' },
  orange: { bg: '#ffedd5', text: '#f97316' },
  slate: { bg: '#f1f5f9', text: '#64748b' },
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)',
}

const toolbarButtonStyle: React.CSSProperties = {
  height: 42,
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  background: '#fff',
  color: '#0f172a',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
  padding: '0 14px',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
}

const iconToolbarButtonStyle: React.CSSProperties = {
  ...toolbarButtonStyle,
  width: 42,
  padding: 0,
  justifyContent: 'center',
}

const smallSelectStyle: React.CSSProperties = {
  height: 34,
  border: '1px solid #e5e7eb',
  borderRadius: 9,
  background: '#fff',
  color: '#334155',
  padding: '0 12px',
  fontSize: 12,
  fontWeight: 800,
}

const viewAllStyle: React.CSSProperties = {
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 800,
  textDecoration: 'none',
}

const inlineLinkStyle: React.CSSProperties = {
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 850,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 13,
}

const emptyActionStyle: React.CSSProperties = {
  height: 34,
  border: '1px solid #e5e7eb',
  borderRadius: 9,
  background: '#fff',
  color: '#2563eb',
  padding: '0 13px',
  fontSize: 12,
  fontWeight: 850,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}
