'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  FilePlus2,
  FileText,
  Filter,
  GitCompareArrows,
  PackagePlus,
  PieChart,
  Plus,
  ReceiptText,
  ShoppingCart,
  Truck,
  Upload,
  UsersRound,
} from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = "var(--font-body)"
const suppliersKey = 'flowsys-suppliers'
const pricebookKey = 'flowsys-pricebook-items'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'
const purchaseRequestsKey = 'flowsys-procurement-purchase-requests'
const rfqsKey = 'flowsys-procurement-rfqs'
const receivingKey = 'flowsys-procurement-receiving'

type SupplierRecord = {
  id?: string | number
  companyId?: string
  name?: string
  status?: string
  rating?: number | string
  deliveryRating?: number | string
}

type PricebookRecord = {
  id?: string | number
  companyId?: string
  name?: string
  status?: string
}

type PurchaseOrderRecord = {
  id?: string | number
  companyId?: string
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
  companyId?: string
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
  companyId?: string
  status?: string
  expiresAt?: string
  validUntil?: string
  quotations?: number | string
  supplierNames?: string[]
  suppliersInvited?: number | string
}

type ReceivingRecord = {
  id?: string | number
  companyId?: string
  status?: string
  leadTimeDays?: number | string
  receivedPercent?: number | string
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
  const [showOverviewFilters, setShowOverviewFilters] = useState(false)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:procurement-overview')
  const dateRangeLabel = useMemo(() => currentMonthRangeLabel(), [])

  useEffect(() => {
    const loadData = () => {
      const activeCompanyId = getActiveCompany()?.id || ''
      setData({
        suppliers: readStored<SupplierRecord>(suppliersKey, activeCompanyId),
        pricebook: readStored<PricebookRecord>(pricebookKey, activeCompanyId),
        purchaseOrders: readStored<PurchaseOrderRecord>(purchaseOrdersKey, activeCompanyId),
        purchaseRequests: readStored<PurchaseRequestRecord>(purchaseRequestsKey, activeCompanyId),
        rfqs: readStored<RfqRecord>(rfqsKey, activeCompanyId),
        receiving: readStored<ReceivingRecord>(receivingKey, activeCompanyId),
      })
    }

    loadData()
    window.addEventListener('storage', loadData)
    window.addEventListener('focus', loadData)
    window.addEventListener(companyChangeEvent, loadData)
    return () => {
      window.removeEventListener('storage', loadData)
      window.removeEventListener('focus', loadData)
      window.removeEventListener(companyChangeEvent, loadData)
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
    const awardedRfqs = data.rfqs.filter(rfq => (rfq.status || '').toLowerCase().includes('award')).length
    const comparisonReady = data.rfqs.filter(rfq => {
      const status = (rfq.status || '').toLowerCase()
      return status.includes('evaluation') || numberValue(rfq.quotations) > 0 || numberValue(rfq.suppliersInvited) > 1 || (rfq.supplierNames || []).length > 1
    }).length
    const inventoryUpdates = data.receiving.filter(item => {
      const status = (item.status || '').toLowerCase()
      return status.includes('received') || status.includes('complete') || numberValue(item.receivedPercent) >= 100
    }).length

    return { totalSpend, pendingRequests, activeSuppliers, avgLeadTime, lowStockItems, overdueDeliveries, priceChanges, expiringQuotations, awardedRfqs, comparisonReady, inventoryUpdates }
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
  const hasSuppliers = data.suppliers.length > 0
  const hasInventoryItems = data.pricebook.length > 0
  const hasRfqs = data.rfqs.length > 0
  const setupItems = useMemo(() => ([
    { label: 'Add suppliers', complete: hasSuppliers, href: '/supplier-database', action: 'Add Supplier' },
    { label: 'Import inventory/items', complete: hasInventoryItems, href: '/procurement/pricebook', action: 'Import Items' },
    { label: 'Create first purchase request', complete: hasPurchaseRequests, href: '/procurement/purchase-requests', action: 'Create Purchase Request' },
    { label: 'Create first RFQ', complete: hasRfqs, href: '/procurement/rfqs', action: 'Create RFQ' },
    { label: 'Create first purchase order', complete: hasPurchaseOrders, href: '/procurement/purchase-orders', action: 'Create Purchase Order' },
  ]), [hasInventoryItems, hasPurchaseOrders, hasPurchaseRequests, hasRfqs, hasSuppliers])
  const nextSetupItem = setupItems.find(item => !item.complete)
  const createOptions = [
    { label: 'Purchase Request', href: '/procurement/purchase-requests', icon: FilePlus2 },
    { label: 'RFQ', href: '/procurement/rfqs', icon: ReceiptText },
    { label: 'Quotation', href: '/procurement/quotations', icon: FileText },
    { label: 'Purchase Order', href: '/procurement/purchase-orders', icon: ShoppingCart },
    { label: 'Receiving', href: '/procurement/receiving', icon: Truck },
    { label: 'Pricebook Item', href: '/procurement/pricebook', icon: PackagePlus },
  ]

  return (
    <div className="procurement-overview-page" style={{ fontFamily: font }}>
      <style>{overviewCss}</style>
      <div className="procurement-overview-head">
        <div>
          <div className="procurement-overview-breadcrumb">
            <span>Procurement</span>
            <span>/</span>
            <span>Overview</span>
          </div>
          <div className="procurement-overview-title-row">
            <span className="procurement-overview-icon">
              <ShoppingCart size={20} />
            </span>
            <div>
              <h1 className="procurement-overview-title">Procurement Overview</h1>
              <p className="procurement-overview-subtitle">Track requests, suppliers, purchase orders, receiving, and spend from one calm workspace.</p>
            </div>
          </div>
        </div>
        <div className="procurement-overview-toolbar">
          <span style={toolbarStaticStyle}>{dateRangeLabel} <CalendarDays size={15} /></span>
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} style={toolbarButtonStyle} />
          <button type="button" style={toolbarButtonStyle} aria-expanded={showOverviewFilters} onClick={() => setShowOverviewFilters(value => !value)}><Filter size={15} /> Filters</button>
          <div className="procurement-primary-wrap">
            <Link href={nextSetupItem?.href || '/procurement/purchase-requests'} className="procurement-primary-action">
              <Plus size={16} /> {nextSetupItem?.action || 'Create Purchase Request'}
            </Link>
            <button type="button" className="procurement-primary-caret" aria-label="More create options" aria-expanded={showCreateMenu} onClick={() => setShowCreateMenu(value => !value)}>
              <ChevronDown size={15} />
            </button>
            {showCreateMenu && (
              <div className="procurement-create-menu">
                {createOptions.map(option => {
                  const Icon = option.icon
                  return (
                    <Link key={option.href} href={option.href} onClick={() => setShowCreateMenu(false)}>
                      <Icon size={15} />
                      {option.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showOverviewFilters && (
        <section className="procurement-overview-filter-panel" aria-label="Procurement overview filters">
          <div>
            <strong>Current scope</strong>
            <span>Active company records for {dateRangeLabel}</span>
          </div>
          <Link href="/procurement/purchase-requests">Pending requests: {stats.pendingRequests}</Link>
          <Link href="/procurement/rfqs">Expiring quotations: {stats.expiringQuotations}</Link>
          <Link href="/procurement/receiving">Overdue deliveries: {stats.overdueDeliveries}</Link>
          <Link href="/procurement/pricebook">Price changes: {stats.priceChanges}</Link>
        </section>
      )}

      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
        <div className="procurement-overview-metrics">
          <MetricCard title="Total Spend" value={formatCurrency(stats.totalSpend)} helper={stats.totalSpend === 0 ? 'Spend starts after POs are created' : 'From saved purchase orders'} empty={stats.totalSpend === 0} icon={ReceiptText} tone="green" />
          <MetricCard title="Purchase Orders" value={String(data.purchaseOrders.length)} helper={data.purchaseOrders.length === 0 ? 'Approved orders will be tracked here' : 'Supplier commitments on file'} empty={data.purchaseOrders.length === 0} icon={FileText} tone="blue" />
          <MetricCard title="Pending Requests" value={String(stats.pendingRequests)} helper={stats.pendingRequests === 0 ? 'Requests awaiting review appear here' : 'Awaiting procurement review'} empty={stats.pendingRequests === 0} icon={FilePlus2} tone="purple" />
          <MetricCard title="Active Suppliers" value={String(stats.activeSuppliers)} helper={stats.activeSuppliers === 0 ? 'Add suppliers before sourcing' : 'Available for sourcing'} empty={stats.activeSuppliers === 0} icon={UsersRound} tone="green" />
          <MetricCard title="Avg. Lead Time" value={stats.avgLeadTime ? `${stats.avgLeadTime.toFixed(1)} days` : '0'} helper={stats.avgLeadTime === 0 ? 'Calculated from received orders' : 'Based on delivery records'} empty={stats.avgLeadTime === 0} icon={Clock3} tone="orange" />
        </div>
      </CollapsibleAnalytics>

      <div className="procurement-overview-grid">
        <div className="procurement-main-column">
          <Panel title="Workspace Snapshot" action={<span style={smallSelectStyle}>Monthly</span>}>
            <div className="procurement-snapshot-grid">
              <SnapshotTile icon={BarChart3} label="Spend this period" value={formatCurrency(stats.totalSpend)} helper={hasSpend ? 'From saved purchase orders' : 'No spend recorded yet'} href="/procurement/purchase-orders" />
              <SnapshotTile icon={ShoppingCart} label="Purchase order status" value={hasPurchaseOrders ? `${data.purchaseOrders.length} active` : 'None yet'} helper={hasPurchaseOrders ? 'Grouped by current status' : 'Create a PO after approval or RFQ'} href="/procurement/purchase-orders" />
              <SnapshotTile icon={PieChart} label="Category data" value={hasInventoryItems ? `${data.pricebook.length} items` : 'Needs items'} helper={hasInventoryItems ? 'Ready for category reporting' : 'Import pricebook items first'} href="/procurement/pricebook" />
            </div>
            {hasPurchaseOrders && <StatusList records={data.purchaseOrders.map(order => order.status || 'Draft')} />}
          </Panel>

          <div className="procurement-overview-two-col">
            <Panel title="Recent Purchase Orders" action={<Link href="/procurement/purchase-orders" style={viewAllStyle}>View all</Link>}>
              {hasPurchaseOrders ? <OrderList orders={data.purchaseOrders.slice(0, 5)} /> : <EmptyState icon={FileText} title="No purchase orders yet" body="Approved supplier commitments and direct procurement orders will appear in this list." action="Create Purchase Order" href="/procurement/purchase-orders" compact />}
            </Panel>
            <Panel title="Pending Requests" action={<Link href="/procurement/purchase-requests" style={viewAllStyle}>View all</Link>}>
              {hasPurchaseRequests ? <RequestList requests={data.purchaseRequests.filter(request => isPendingStatus(request.status)).slice(0, 5)} /> : <EmptyState icon={Clock3} title="No pending requests" body="Submitted purchase requests awaiting review will appear here." action="Create Purchase Request" href="/procurement/purchase-requests" compact />}
            </Panel>
          </div>

          <Panel title="Alerts & Insights">
            <div className="procurement-insight-grid">
              <InsightCard icon={AlertTriangle} title="Low Stock Items" value={`${stats.lowStockItems} items`} body={stats.lowStockItems ? 'Needs attention' : 'No items to reorder'} href="/resources/inventory" link="View items" tone="orange" />
              <InsightCard icon={Truck} title="Overdue Deliveries" value={`${stats.overdueDeliveries} orders`} body={stats.overdueDeliveries ? 'Require attention' : 'No overdue deliveries'} href="/procurement/receiving" link="View orders" tone="purple" />
              <InsightCard icon={BarChart3} title="Price Changes" value={`${stats.priceChanges} items`} body={stats.priceChanges ? 'Updated recently' : 'No price changes'} href="/procurement/pricebook" link="View changes" tone="green" />
              <InsightCard icon={Clock3} title="Expiring Quotations" value={`${stats.expiringQuotations} quotes`} body={stats.expiringQuotations ? 'Expiring soon' : 'No expiring quotes'} href="/procurement/rfqs" link="View quotes" tone="slate" />
            </div>
          </Panel>
        </div>

        <div className="procurement-side-column">
          <SideCard title="Quick Actions">
            <div className="procurement-quick-actions">
              <QuickAction href="/procurement/purchase-requests" icon={FilePlus2} label="New Purchase Request" />
              <QuickAction href="/procurement/purchase-orders" icon={FileText} label="New Purchase Order" />
              <QuickAction href="/procurement/rfqs" icon={ReceiptText} label="New RFQ / Quotation" />
              <QuickAction href="/procurement/pricebook" icon={PackagePlus} label="Add New Item" />
              <QuickAction href="/supplier-database" icon={UsersRound} label="Add New Supplier" />
              <QuickAction href="/procurement/pricebook" icon={Upload} label="Import Items" />
              <QuickAction href="/procurement/vendor-comparison" icon={GitCompareArrows} label="Compare Suppliers" />
            </div>
          </SideCard>

          <SideCard title="Top Suppliers by Spend" action="View all" actionHref="/supplier-database">
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
              <EmptyState icon={UsersRound} title={hasSuppliers ? 'No supplier spend yet' : 'No suppliers added yet'} body={hasSuppliers ? 'Top suppliers by spend will appear after purchase orders are linked to suppliers.' : 'Add at least one supplier before creating RFQs or comparing quotations.'} action={hasSuppliers ? undefined : 'Add Supplier'} href={hasSuppliers ? undefined : '/supplier-database'} compact />
            )}
          </SideCard>

          <SideCard title="Recent Activity" action="View all" actionHref="/procurement/approvals">
            <EmptyState icon={BellIcon} title="No activity yet" body="Approvals, RFQs, purchase orders, and receiving updates will appear here." compact />
          </SideCard>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, helper, empty, icon: Icon, tone }: { title: string; value: string; helper: string; empty: boolean; icon: React.ComponentType<IconProps>; tone: keyof typeof tones }) {
  const color = tones[tone]
  return (
    <div className="procurement-metric-card" style={cardStyle}>
      <div className="procurement-metric-top">
        <span className="procurement-metric-icon" style={{ background: color.bg, color: color.text }}><Icon size={19} /></span>
        <div className="procurement-metric-label">{title}</div>
      </div>
      <div className="procurement-metric-value">{value}</div>
      <div className={`procurement-metric-helper${empty ? ' is-empty' : ''}`}>{helper}</div>
      <Sparkline color={color.text} />
    </div>
  )
}

function Sparkline({ color }: { color: string }) {
  return (
    <svg className="procurement-metric-spark" width={76} height={26} viewBox="0 0 72 22" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="0,18 12,15 24,16 36,10 48,12 60,6 72,9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="procurement-panel" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 850, color: '#0f172a' }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SideCard({ title, action, actionHref, children }: { title: string; action?: string; actionHref?: string; children: React.ReactNode }) {
  return (
    <section className="procurement-panel" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 850, color: '#0f172a' }}>{title}</h2>
        {action && actionHref ? <Link href={actionHref} style={viewAllStyle}>{action}</Link> : action && <span style={{ color: '#2563eb', fontSize: 12, fontWeight: 800 }}>{action}</span>}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ icon: Icon, title, body, action, href, compact = false }: { icon: React.ComponentType<IconProps>; title: string; body: string; action?: string; href?: string; compact?: boolean }) {
  const content = (
    <div className={`procurement-empty-state${compact ? ' compact' : ''}`}>
      <div>
        <span className="procurement-empty-icon">
          <Icon size={compact ? 26 : 32} />
        </span>
        <div className="procurement-empty-title">{title}</div>
        <p>{body}</p>
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

function SnapshotTile({ icon: Icon, label, value, helper, href }: { icon: React.ComponentType<IconProps>; label: string; value: string; helper: string; href: string }) {
  return (
    <Link href={href} className="procurement-snapshot-tile">
      <span><Icon size={18} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{helper}</p>
      </div>
    </Link>
  )
}

function StatusList({ records }: { records: string[] }) {
  const counts = records.reduce<Record<string, number>>((acc, status) => {
    const key = status || 'Draft'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  return (
    <div style={{ display: 'grid', gap: 11, minHeight: 172, alignContent: 'center' }}>
      {Object.entries(counts).map(([status, count]) => (
        <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#000000', fontWeight: 700 }}>{status}</span>
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
          <span style={{ gridColumn: '2 / span 1', color: '#000000' }}>{item.meta}</span>
        </div>
      ))}
    </div>
  )
}

function InsightCard({ icon: Icon, title, value, body, href, link, tone }: { icon: React.ComponentType<IconProps>; title: string; value: string; body: string; href: string; link: string; tone: keyof typeof tones }) {
  const color = tones[tone]
  return (
    <div className="procurement-insight-card">
      <span className="procurement-insight-icon" style={{ background: color.bg, color: color.text }}>
        <Icon size={20} />
      </span>
      <div className="procurement-insight-title">{title}</div>
      <div className="procurement-insight-value">{value}</div>
      <div className="procurement-insight-body">{body}</div>
      <Link href={href} style={inlineLinkStyle}>{link} <ArrowRight size={14} /></Link>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<IconProps>; label: string }) {
  return (
    <Link href={href} className="procurement-quick-action">
      <span><Icon size={17} /></span>
      <strong>{label}</strong>
      <ArrowRight size={14} />
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

function readStored<T extends { id?: string | number; companyId?: string }>(key: string, companyId: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const scopedKey = companyId ? companyScopedKey(key, companyId) : key
    const scoped = parseRows<T>(window.localStorage.getItem(scopedKey))
    const global = parseRows<T>(window.localStorage.getItem(key))
    const scopedGlobal = scoped.length ? global.filter(row => row.companyId === companyId) : global
    const rows = scoped.length ? [...scoped, ...scopedGlobal] : scopedGlobal
    const unique = uniqueRows(rows)
    return unique.filter(row => !companyId || !row.companyId || row.companyId === companyId)
  } catch {
    return []
  }
}

function parseRows<T>(value: string | null): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

function uniqueRows<T extends { id?: string | number }>(rows: T[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const id = row.id ? String(row.id) : `row-${index}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
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
  green: { bg: '#dcfce7', text: '#166534' },
  blue: { bg: '#dbeafe', text: '#1d4ed8' },
  purple: { bg: '#ede9fe', text: '#6d28d9' },
  orange: { bg: '#ffedd5', text: '#c2410c' },
  slate: { bg: '#f1f5f9', text: '#000000' },
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d8dee8',
  borderRadius: 8,
  padding: 18,
  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
}

const toolbarButtonStyle: React.CSSProperties = {
  height: 40,
  border: '1px solid #cfd7e3',
  borderRadius: 8,
  background: '#fff',
  color: '#101828',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
  padding: '0 14px',
  fontSize: 13,
  fontWeight: 750,
  cursor: 'pointer',
}

const toolbarStaticStyle: React.CSSProperties = {
  ...toolbarButtonStyle,
  cursor: 'default',
}

const smallSelectStyle: React.CSSProperties = {
  height: 36,
  border: '1px solid #cfd7e3',
  borderRadius: 8,
  background: '#fff',
  color: '#344054',
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
}

const viewAllStyle: React.CSSProperties = {
  color: '#1d4ed8',
  fontSize: 13,
  fontWeight: 800,
  textDecoration: 'none',
}

const inlineLinkStyle: React.CSSProperties = {
  color: '#1d4ed8',
  fontSize: 13,
  fontWeight: 850,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 13,
}

const emptyActionStyle: React.CSSProperties = {
  height: 38,
  border: '1px solid #cfd7e3',
  borderRadius: 8,
  background: '#fff',
  color: '#1d4ed8',
  padding: '0 13px',
  fontSize: 13,
  fontWeight: 850,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const overviewCss = `
.procurement-overview-page {
  padding: 24px 28px 42px;
}
.procurement-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}
.procurement-setup-card {
  background: #fff;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.045);
  display: grid;
  grid-template-columns: minmax(220px, 1.1fr) minmax(160px, .55fr) minmax(260px, 1.35fr) auto;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.procurement-setup-main {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}
.procurement-setup-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: #ecfdf3;
  color: #16a34a;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.procurement-setup-kicker {
  color: #16a34a;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.procurement-setup-main h2 {
  margin: 3px 0 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 900;
}
.procurement-setup-main p {
  margin: 6px 0 0;
  color: #000000;
  font-size: 12px;
  line-height: 1.4;
}
.procurement-setup-progress {
  display: grid;
  gap: 8px;
}
.procurement-setup-progress div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.procurement-setup-progress strong {
  color: #0f172a;
  font-size: 18px;
  font-weight: 900;
}
.procurement-setup-progress div span {
  color: #000000;
  font-size: 11px;
  font-weight: 800;
}
.procurement-setup-progress > span {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;
}
.procurement-setup-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #16a34a;
}
.procurement-setup-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.procurement-setup-item {
  min-height: 30px;
  border: 1px solid #e8edf4;
  border-radius: 999px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #000000;
  background: #f8fafc;
  text-decoration: none;
  font-size: 11px;
  font-weight: 850;
}
.procurement-setup-item svg {
  color: #000000;
}
.procurement-setup-item.complete {
  border-color: #bbf7d0;
  color: #166534;
  background: #f0fdf4;
}
.procurement-setup-item.complete svg {
  color: #16a34a;
}
.procurement-setup-cta {
  min-height: 38px;
  border-radius: 10px;
  background: #16a34a;
  color: #fff;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
  box-shadow: 0 10px 22px rgba(22, 163, 74, .18);
}
.procurement-overview-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 14px;
  align-items: stretch;
  margin-bottom: 16px;
}
.procurement-metric-card {
  min-height: 108px;
  display: flex;
  align-items: center;
}
.procurement-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
}
.procurement-overview-chart-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr;
  gap: 16px;
}
.procurement-overview-two-col,
.procurement-insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.procurement-insight-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.procurement-lifecycle {
  display: grid;
  grid-template-columns: repeat(7, minmax(118px, 1fr));
  gap: 12px;
}
.procurement-lifecycle-step {
  position: relative;
  min-height: 148px;
  border: 1px solid #e8edf4;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
  color: #0f172a;
  text-decoration: none;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
}
.procurement-lifecycle-step:hover {
  border-color: #86efac;
  box-shadow: 0 16px 32px rgba(22, 163, 74, .11);
  transform: translateY(-2px);
}
.procurement-lifecycle-step::after {
  content: ">";
  position: absolute;
  top: 32px;
  right: -16px;
  z-index: 2;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #fff;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 4px 12px rgba(15, 23, 42, .06);
}
.procurement-lifecycle-step:last-child::after {
  display: none;
}
.procurement-lifecycle-step.recommended {
  border-color: #22c55e;
  background: #f0fdf4;
  box-shadow: 0 16px 34px rgba(22, 163, 74, .14);
}
.procurement-lifecycle-index {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #dcfce7;
  color: #16a34a;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
  font-weight: 950;
}
.procurement-lifecycle-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #f0fdf4;
  color: #16a34a;
  display: grid;
  place-items: center;
}
.procurement-lifecycle strong {
  font-size: 13px;
  font-weight: 950;
}
.procurement-lifecycle small {
  color: #000000;
  font-size: 10.5px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.procurement-lifecycle b {
  margin-top: auto;
  color: #0f172a;
  font-size: 12px;
}
.procurement-lifecycle em {
  align-self: flex-start;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  padding: 4px 7px;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}
.procurement-empty-state {
  min-height: 172px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 20px 12px;
}
.procurement-empty-state.compact {
  min-height: 128px;
  padding: 14px 6px;
}
.procurement-empty-icon {
  width: 68px;
  height: 68px;
  border-radius: 999px;
  background: #f0fdf4;
  color: #16a34a;
  display: inline-grid;
  place-items: center;
  margin-bottom: 12px;
  box-shadow: inset 0 0 0 1px #bbf7d0;
}
.procurement-empty-state.compact .procurement-empty-icon {
  width: 54px;
  height: 54px;
}
.procurement-empty-title {
  color: #0f172a;
  font-size: 14px;
  font-weight: 900;
}
.procurement-empty-state p {
  margin: 8px auto 0;
  max-width: 270px;
  color: #000000;
  font-size: 12px;
  line-height: 1.55;
}
.procurement-guide-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.procurement-guide-notes span {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 850;
}
.procurement-quick-actions {
  display: grid;
  gap: 8px;
}
.procurement-quick-action {
  min-height: 46px;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  text-decoration: none;
  color: #0f172a;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 850;
  background: #fff;
  transition: border-color .16s ease, background .16s ease, transform .16s ease;
}
.procurement-quick-action:hover {
  border-color: #bbf7d0;
  background: #f8fffb;
  transform: translateY(-1px);
}
.procurement-quick-action span {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #16a34a;
  background: #dcfce7;
}
.procurement-quick-action strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.procurement-quick-action > svg {
  color: #000000;
}
@media (max-width: 1400px) {
  .procurement-setup-card {
    grid-template-columns: minmax(240px, 1fr) minmax(160px, .55fr);
  }
  .procurement-setup-list,
  .procurement-setup-cta {
    grid-column: span 1;
  }
  .procurement-overview-metrics {
    grid-template-columns: repeat(3, minmax(180px, 1fr));
  }
  .procurement-lifecycle {
    grid-auto-flow: column;
    grid-auto-columns: minmax(168px, 1fr);
    grid-template-columns: none;
    overflow-x: auto;
    padding: 2px 2px 10px;
    scroll-snap-type: x proximity;
  }
  .procurement-lifecycle-step {
    scroll-snap-align: start;
  }
}
@media (max-width: 1120px) {
  .procurement-setup-card {
    grid-template-columns: 1fr;
  }
  .procurement-setup-list,
  .procurement-setup-cta {
    grid-column: auto;
  }
  .procurement-setup-cta {
    justify-self: start;
  }
  .procurement-overview-grid,
  .procurement-overview-chart-grid {
    grid-template-columns: 1fr;
  }
  .procurement-insight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .procurement-overview-page {
    padding: 18px 14px 32px;
  }
  .procurement-overview-head {
    display: grid;
  }
  .procurement-overview-metrics,
  .procurement-overview-two-col,
  .procurement-insight-grid {
    grid-template-columns: 1fr;
  }
  .procurement-setup-list {
    display: grid;
  }
  .procurement-setup-item,
  .procurement-setup-cta {
    width: 100%;
  }
  .procurement-lifecycle {
    grid-auto-flow: row;
    grid-auto-columns: auto;
    grid-template-columns: 1fr;
    overflow-x: visible;
    padding: 0;
  }
  .procurement-lifecycle-step::after {
    content: "v";
    top: auto;
    right: auto;
    bottom: -17px;
    left: 24px;
  }
  .procurement-lifecycle-step:last-child::after {
    display: none;
  }
  .procurement-lifecycle small {
    -webkit-line-clamp: 3;
  }
}

/* Calmer overview pass: fewer competing boxes, clearer task hierarchy. */
.procurement-overview-page {
  padding: 24px 28px 40px;
  background: #f8fafc;
}
.procurement-primary-wrap {
  display: inline-flex;
  align-items: stretch;
  border-radius: 10px;
  overflow: visible;
  position: relative;
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.18);
}
.procurement-primary-action {
  min-height: 42px;
  border-radius: 10px 0 0 10px;
  background: #16a34a;
  color: #fff;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}
.procurement-primary-action:hover {
  background: #15913f;
}
.procurement-primary-caret {
  min-height: 42px;
  width: 38px;
  border-radius: 0 10px 10px 0;
  border: 0 !important;
  border-left: 1px solid rgba(255, 255, 255, 0.24) !important;
  background: #16a34a !important;
  color: #fff !important;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.procurement-primary-caret:hover {
  background: #15913f !important;
}
.procurement-create-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: 210px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, .16);
  padding: 6px;
  display: grid;
  gap: 2px;
}
.procurement-create-menu a {
  min-height: 36px;
  border-radius: 8px;
  color: #0f172a;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}
.procurement-create-menu a:hover {
  background: #f8fafc;
}
.procurement-create-menu svg {
  color: #16a34a;
}
.procurement-overview-filter-panel {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  margin: -6px 0 16px;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) repeat(4, auto);
  gap: 10px;
  align-items: center;
}
.procurement-overview-filter-panel div {
  min-width: 0;
}
.procurement-overview-filter-panel strong {
  display: block;
  color: #0f172a;
  font-size: 12px;
  font-weight: 900;
}
.procurement-overview-filter-panel span {
  display: block;
  color: #000000;
  font-size: 11px;
  margin-top: 3px;
}
.procurement-overview-filter-panel a {
  min-height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  color: #334155;
  background: #f8fafc;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  font-size: 11px;
  font-weight: 850;
  white-space: nowrap;
}
.procurement-overview-filter-panel a:hover {
  border-color: #bbf7d0;
  color: #166534;
  background: #f0fdf4;
}
.procurement-metric-spark {
  position: absolute;
  right: 16px;
  bottom: 14px;
  opacity: 0.85;
}
.procurement-setup-card {
  border-color: #e2e8f0;
  border-radius: 12px;
  grid-template-columns: minmax(240px, 1fr) minmax(180px, .45fr) auto;
  box-shadow: none;
}
.procurement-setup-list {
  display: none;
}
.procurement-setup-cta {
  background: #0f172a;
  box-shadow: none;
}
.procurement-overview-metrics {
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 10px;
}
.procurement-metric-card {
  min-height: 116px;
  display: block;
  position: relative;
  overflow: hidden;
}
.procurement-overview-grid {
  grid-template-columns: minmax(0, 1fr) 280px;
}
.procurement-main-column,
.procurement-side-column {
  display: grid;
  gap: 16px;
  align-self: start;
}
.procurement-panel {
  overflow: hidden;
}
.procurement-insight-grid {
  gap: 10px;
}
.procurement-lifecycle {
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.procurement-lifecycle-step {
  min-height: 126px;
  border: 0;
  border-right: 1px solid #e2e8f0;
  border-radius: 0;
  background: #fff;
  gap: 6px;
  box-shadow: none;
}
.procurement-lifecycle-step:hover {
  border-color: #e2e8f0;
  background: #f8fafc;
  box-shadow: none;
  transform: none;
}
.procurement-lifecycle-step::after {
  content: ">";
  top: 50%;
  right: -7px;
  width: 14px;
  height: 18px;
  margin-top: -9px;
  color: #000000;
  border-color: #e2e8f0;
  font-size: 11px;
  box-shadow: none;
}
.procurement-lifecycle-step:last-child {
  border-right: 0;
}
.procurement-lifecycle-step.recommended {
  background: #f8fafc;
  border-color: #e2e8f0;
  box-shadow: inset 0 0 0 2px #0f172a;
}
.procurement-lifecycle-index {
  width: 20px;
  height: 20px;
}
.procurement-lifecycle-icon {
  width: 30px;
  height: 30px;
}
.procurement-lifecycle strong {
  font-size: 12px;
}
.procurement-lifecycle b {
  font-size: 11px;
}
.procurement-empty-state {
  min-height: 150px;
}
.procurement-empty-icon {
  width: 56px;
  height: 56px;
}
.procurement-snapshot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.procurement-snapshot-tile {
  min-height: 112px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  text-decoration: none;
  color: #0f172a;
  background: #fff;
}
.procurement-snapshot-tile > span {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #0f172a;
  background: #f1f5f9;
}
.procurement-snapshot-tile small {
  display: block;
  color: #000000;
  font-size: 11px;
  font-weight: 800;
}
.procurement-snapshot-tile strong {
  display: block;
  color: #0f172a;
  font-size: 18px;
  font-weight: 900;
  margin-top: 5px;
}
.procurement-snapshot-tile p {
  margin: 7px 0 0;
  color: #000000;
  font-size: 11px;
  line-height: 1.35;
}
.procurement-quick-action {
  min-height: 44px;
  border-radius: 10px;
}
@media (max-width: 1400px) {
  .procurement-setup-card {
    grid-template-columns: minmax(240px, 1fr) minmax(160px, .55fr) auto;
  }
  .procurement-lifecycle {
    grid-auto-flow: column;
    grid-auto-columns: minmax(160px, 1fr);
    grid-template-columns: none;
    overflow-x: auto;
    padding: 0;
  }
  .procurement-lifecycle-step {
    scroll-snap-align: start;
  }
}
@media (max-width: 1120px) {
  .procurement-overview-grid,
  .procurement-snapshot-grid,
  .procurement-overview-filter-panel {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .procurement-overview-page {
    padding: 18px 14px 32px;
  }
  .procurement-primary-action,
  .procurement-setup-cta {
    width: 100%;
  }
  .procurement-overview-metrics,
  .procurement-snapshot-grid {
    grid-template-columns: 1fr;
  }
  .procurement-lifecycle-step {
    border-right: 0;
    border-bottom: 1px solid #e2e8f0;
  }
  .procurement-lifecycle-step::after {
    content: "";
    display: none;
  }
}

/* Senior QA/UI polish: readable scale, stronger contrast, stable controls. */
.procurement-overview-page {
  padding: 28px 28px 40px;
  background: #f4f6f8;
  color: #101828;
}
.procurement-overview-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 20px 24px;
  margin-bottom: 22px;
}
.procurement-overview-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475467;
  font-size: 13px;
  line-height: 18px;
  margin-bottom: 10px;
}
.procurement-overview-breadcrumb span:last-child {
  color: #101828;
  font-weight: 750;
}
.procurement-overview-title-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}
.procurement-overview-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #dcfce7;
  color: #166534;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  box-shadow: inset 0 0 0 1px #bbf7d0;
}
.procurement-overview-title {
  margin: 0;
  color: #101828 !important;
  font-size: 30px !important;
  font-weight: 750 !important;
  line-height: 36px !important;
  letter-spacing: 0;
}
.procurement-overview-subtitle {
  margin: 7px 0 0;
  max-width: 650px;
  color: #475467 !important;
  font-size: 14px;
  font-weight: 400 !important;
  line-height: 1.5;
}
.procurement-overview-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}
.procurement-primary-wrap {
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba(16, 24, 40, 0.12);
}
.procurement-primary-action {
  min-height: 44px;
  border-radius: 8px 0 0 8px;
  background: #101828;
  color: #ffffff;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 850;
}
.procurement-primary-action:hover {
  background: #1d2939;
}
.procurement-primary-caret {
  min-height: 44px;
  width: 40px;
  border-radius: 0 8px 8px 0;
  background: #101828 !important;
}
.procurement-primary-caret:hover {
  background: #1d2939 !important;
}
.procurement-create-menu {
  width: 226px;
  border-color: #d8dee8;
  border-radius: 8px;
  box-shadow: 0 18px 42px rgba(16, 24, 40, 0.18);
}
.procurement-create-menu a {
  min-height: 38px;
  border-radius: 6px;
  color: #101828;
  font-size: 13px;
  font-weight: 750;
}
.procurement-create-menu svg {
  color: #166534;
}
.procurement-overview-filter-panel {
  border-color: #d8dee8;
  border-radius: 8px;
  margin: -4px 0 18px;
  padding: 14px;
}
.procurement-overview-filter-panel strong {
  color: #101828;
  font-size: 13px;
}
.procurement-overview-filter-panel span {
  color: #475467;
  font-size: 13px;
}
.procurement-overview-filter-panel a {
  min-height: 34px;
  border-color: #d8dee8;
  color: #344054;
  font-size: 12px;
  font-weight: 750;
}
.procurement-overview-metrics {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.procurement-metric-card {
  min-height: 150px;
  display: block;
  position: relative;
  overflow: hidden;
}
.procurement-metric-top {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.procurement-metric-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.procurement-metric-label {
  color: #475467 !important;
  font-size: 13px;
  font-weight: 700 !important;
  line-height: 1.28;
}
.procurement-metric-value {
  color: #101828;
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  margin-top: 14px;
}
.procurement-metric-helper {
  max-width: 100%;
  min-height: auto;
  color: #166534 !important;
  font-size: 13px;
  font-weight: 500 !important;
  line-height: 1.35;
  margin-top: 8px;
}
.procurement-metric-helper.is-empty {
  color: #475467 !important;
}
.procurement-metric-spark {
  display: none;
}
.procurement-overview-grid {
  grid-template-columns: minmax(0, 1fr) 304px;
  gap: 18px;
}
.procurement-main-column,
.procurement-side-column {
  gap: 18px;
}
.procurement-panel {
  overflow: hidden;
}
.procurement-panel h2 {
  color: #101828 !important;
  font-size: 16px !important;
  line-height: 22px !important;
  font-weight: 750 !important;
}
.procurement-snapshot-grid {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}
.procurement-snapshot-tile {
  min-height: 124px;
  border-color: #d8dee8;
  border-radius: 8px;
  padding: 16px;
  gap: 13px;
  transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
}
.procurement-snapshot-tile:hover {
  border-color: #98a2b3;
  background: #fbfcfe;
  box-shadow: 0 8px 18px rgba(16, 24, 40, 0.06);
}
.procurement-snapshot-tile > span {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  color: #101828;
  background: #eef2f6;
}
.procurement-snapshot-tile small {
  color: #475467;
  font-size: 12px;
  line-height: 1.35;
}
.procurement-snapshot-tile strong {
  color: #101828;
  font-size: 20px;
  font-weight: 800;
}
.procurement-snapshot-tile p {
  color: #475467;
  font-size: 13px;
  line-height: 1.4;
}
.procurement-insight-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.procurement-insight-card {
  border: 1px solid #d8dee8;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}
.procurement-insight-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
}
.procurement-insight-title {
  color: #101828;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
}
.procurement-insight-value {
  color: #101828;
  font-size: 18px;
  font-weight: 800;
  margin-top: 6px;
}
.procurement-insight-body {
  color: #475467;
  font-size: 13px;
  line-height: 1.4;
  margin-top: 4px;
}
.procurement-empty-state {
  min-height: 162px;
  padding: 18px 12px;
}
.procurement-empty-state.compact {
  min-height: 148px;
}
.procurement-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: #f0fdf4;
  color: #166534;
  box-shadow: inset 0 0 0 1px #bbf7d0;
}
.procurement-empty-title {
  color: #101828;
  font-size: 14px;
  font-weight: 800;
}
.procurement-empty-state p {
  color: #475467;
  font-size: 13px;
  line-height: 1.5;
}
.procurement-quick-actions {
  gap: 10px;
}
.procurement-quick-action {
  min-height: 48px;
  border-color: #d8dee8;
  border-radius: 8px;
  grid-template-columns: 36px minmax(0, 1fr) 16px;
  gap: 10px;
  padding: 8px 12px;
  color: #101828;
  font-size: 13px;
  font-weight: 750;
}
.procurement-quick-action:hover {
  border-color: #98a2b3;
  background: #fbfcfe;
}
.procurement-quick-action span {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #166534;
  background: #dcfce7;
}
.procurement-quick-action strong {
  font-weight: 750;
}

@media (max-width: 1280px) {
  .procurement-overview-grid {
    grid-template-columns: minmax(0, 1fr) 292px;
  }
}
@media (max-width: 1120px) {
  .procurement-overview-head,
  .procurement-overview-grid,
  .procurement-overview-filter-panel {
    grid-template-columns: 1fr;
  }
  .procurement-overview-toolbar {
    justify-content: flex-start;
  }
  .procurement-overview-metrics {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  .procurement-insight-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}
@media (max-width: 760px) {
  .procurement-overview-page {
    padding: 18px 14px 32px;
  }
  .procurement-overview-title-row {
    gap: 12px;
  }
  .procurement-overview-icon {
    width: 40px;
    height: 40px;
  }
  .procurement-overview-title {
    font-size: 26px !important;
    line-height: 31px !important;
  }
  .procurement-overview-subtitle {
    font-size: 14px;
  }
  .procurement-overview-toolbar,
  .procurement-primary-wrap {
    width: 100%;
  }
  .procurement-overview-toolbar > span,
  .procurement-overview-toolbar > button,
  .procurement-primary-wrap {
    flex: 1 1 100%;
  }
  .procurement-primary-action {
    flex: 1;
  }
  .procurement-overview-metrics,
  .procurement-snapshot-grid {
    grid-template-columns: 1fr;
  }
  .procurement-metric-helper {
    max-width: calc(100% - 86px);
  }
}

html[data-theme] body .procurement-overview-page .procurement-overview-subtitle,
html[data-theme] body .procurement-overview-page .procurement-metric-label,
html[data-theme] body .procurement-overview-page .procurement-snapshot-tile small,
html[data-theme] body .procurement-overview-page .procurement-snapshot-tile p,
html[data-theme] body .procurement-overview-page .procurement-insight-body,
html[data-theme] body .procurement-overview-page .procurement-empty-state p {
  color: #475467 !important;
}
html[data-theme] body .procurement-overview-page .procurement-overview-subtitle,
html[data-theme] body .procurement-overview-page .procurement-empty-state p {
  font-weight: 400 !important;
}
html[data-theme] body .procurement-overview-page .procurement-metric-helper {
  color: #166534 !important;
  font-weight: 500 !important;
}
html[data-theme] body .procurement-overview-page .procurement-metric-helper.is-empty {
  color: #475467 !important;
}
`
