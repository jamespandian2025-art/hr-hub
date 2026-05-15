'use client'

import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileText,
  Filter,
  Funnel,
  MoreHorizontal,
  Package,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShoppingBag,
  Truck,
  UserRound,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react'
import { type CompanyRecord, companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Lost'
type OpportunityStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired'
type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid'
type DeliveryStatus = 'Pending' | 'Picking' | 'Packed' | 'Delivered'
type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled'

type Lead = {
  id: string
  companyId?: string
  leadName: string
  company: string
  contact: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  salesRep: string
  createdDate: string
  lostReason?: string
}

type Opportunity = {
  id: string
  companyId?: string
  name: string
  customer: string
  expectedValue: number
  probability: number
  stage: OpportunityStage
  expectedCloseDate: string
  salesRep: string
  lostReason?: string
}

type Quote = {
  id: string
  companyId?: string
  customer: string
  items: string
  subtotal: number
  discount: number
  tax: number
  total: number
  validUntil: string
  status: QuoteStatus
}

type SalesOrder = {
  id: string
  companyId?: string
  customer: string
  orderDate: string
  deliveryDate: string
  amount: number
  paymentStatus: PaymentStatus
  deliveryStatus: DeliveryStatus
  salesRep: string
  productCategory: string
}

type Invoice = {
  id: string
  companyId?: string
  customer: string
  issueDate: string
  dueDate: string
  amount: number
  paidAmount: number
  balanceDue: number
  status: InvoiceStatus
}

type Customer = {
  id: string
  companyId?: string
  name: string
  contact: string
  email: string
  phone: string
  totalPurchases: number
  outstandingBalance: number
  lastOrderDate: string
  status: 'Active' | 'Inactive'
}

type Product = {
  id: string
  companyId?: string
  name: string
  sku: string
  category: string
  price: number
  cost: number
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock'
  active: boolean
}

type SalesForm = {
  customer: string
  amount: string
  salesRep: string
  category: string
  closeDate: string
}

type SalesWorkspaceData = {
  leads: Lead[]
  opportunities: Opportunity[]
  quotes: Quote[]
  orders: SalesOrder[]
  invoices: Invoice[]
  customers: Customer[]
  products: Product[]
}

const font = 'var(--font-body)'
const green = '#16a34a'
const tabs = ['Overview', 'Leads', 'Opportunities', 'Quotes', 'Sales Orders', 'Invoices', 'Customers', 'Products', 'Sales Analytics']
const reps = ['Emily Clark', 'Michael Smith', 'Robert Brown', 'Alex Scott', 'Jessica White', 'James Pandian']

const seedLeads: Lead[] = [
  { id: 'LD-1008', leadName: 'Modernize field operations', company: 'Northstar Builders', contact: 'Olivia Martin', email: 'olivia@northstarbuild.com', phone: '+1 415 555 0182', source: 'Website', status: 'New', salesRep: 'Emily Clark', createdDate: '2026-05-14' },
  { id: 'LD-1007', leadName: 'Inventory controls rollout', company: 'Canyon Supply Co.', contact: 'Noah Reyes', email: 'noah@canyonsupply.com', phone: '+1 512 555 0148', source: 'Referral', status: 'Contacted', salesRep: 'Michael Smith', createdDate: '2026-05-12' },
  { id: 'LD-1006', leadName: 'Construction ERP discovery', company: 'BluePeak Construction', contact: 'Mia Chen', email: 'mia@bluepeak.com', phone: '+1 206 555 0193', source: 'Trade Show', status: 'Qualified', salesRep: 'Jessica White', createdDate: '2026-05-10' },
  { id: 'LD-1005', leadName: 'Mobile approvals app', company: 'Urban Grid Group', contact: 'Daniel Stone', email: 'daniel@urbangrid.com', phone: '+1 303 555 0177', source: 'LinkedIn', status: 'Lost', salesRep: 'Alex Scott', createdDate: '2026-05-07', lostReason: 'Budget deferred' },
]

const seedOpportunities: Opportunity[] = [
  { id: 'OP-2409', name: 'Enterprise CRM + project controls', customer: 'Apex Infrastructure', expectedValue: 128000, probability: 82, stage: 'Negotiation', expectedCloseDate: '2026-06-10', salesRep: 'Emily Clark' },
  { id: 'OP-2408', name: 'Warehouse automation package', customer: 'Summit Materials', expectedValue: 86400, probability: 68, stage: 'Proposal', expectedCloseDate: '2026-06-18', salesRep: 'Michael Smith' },
  { id: 'OP-2407', name: 'Financial workflow implementation', customer: 'Keystone Holdings', expectedValue: 54000, probability: 44, stage: 'Qualified', expectedCloseDate: '2026-07-02', salesRep: 'Jessica White' },
  { id: 'OP-2406', name: 'Safety and HR performance suite', customer: 'HarborWorks', expectedValue: 37750, probability: 100, stage: 'Won', expectedCloseDate: '2026-05-09', salesRep: 'Robert Brown' },
  { id: 'OP-2405', name: 'Procurement digitization', customer: 'MetroBuild Partners', expectedValue: 29100, probability: 0, stage: 'Lost', expectedCloseDate: '2026-05-02', salesRep: 'Alex Scott', lostReason: 'Chose incumbent vendor' },
]

const seedQuotes: Quote[] = [
  { id: 'QT-2026-0418', customer: 'Apex Infrastructure', items: 'CRM licenses, implementation, reporting pack', subtotal: 118000, discount: 6000, tax: 8960, total: 120960, validUntil: '2026-06-03', status: 'Sent' },
  { id: 'QT-2026-0417', customer: 'Summit Materials', items: 'Inventory module, barcode workflows, support', subtotal: 82000, discount: 2500, tax: 6360, total: 85860, validUntil: '2026-06-07', status: 'Draft' },
  { id: 'QT-2026-0416', customer: 'HarborWorks', items: 'HR performance, commission tracking, onboarding', subtotal: 36000, discount: 0, tax: 2880, total: 38880, validUntil: '2026-05-28', status: 'Accepted' },
]

const seedOrders: SalesOrder[] = [
  { id: 'SO-2026-0521', customer: 'HarborWorks', orderDate: '2026-05-09', deliveryDate: '2026-05-24', amount: 38880, paymentStatus: 'Paid', deliveryStatus: 'Delivered', salesRep: 'Robert Brown', productCategory: 'HR Suite' },
  { id: 'SO-2026-0520', customer: 'StoneBridge Developers', orderDate: '2026-05-06', deliveryDate: '2026-05-27', amount: 64200, paymentStatus: 'Partially Paid', deliveryStatus: 'Packed', salesRep: 'Emily Clark', productCategory: 'ERP Platform' },
  { id: 'SO-2026-0519', customer: 'GreenLine Contractors', orderDate: '2026-05-03', deliveryDate: '2026-05-26', amount: 27600, paymentStatus: 'Unpaid', deliveryStatus: 'Picking', salesRep: 'Jessica White', productCategory: 'Procurement' },
  { id: 'SO-2026-0518', customer: 'NovaBuild', orderDate: '2026-04-26', deliveryDate: '2026-05-18', amount: 73150, paymentStatus: 'Paid', deliveryStatus: 'Delivered', salesRep: 'Michael Smith', productCategory: 'Warehouse' },
]

const seedInvoices: Invoice[] = [
  { id: 'INV-2026-0722', customer: 'HarborWorks', issueDate: '2026-05-09', dueDate: '2026-05-24', amount: 38880, paidAmount: 38880, balanceDue: 0, status: 'Paid' },
  { id: 'INV-2026-0721', customer: 'StoneBridge Developers', issueDate: '2026-05-06', dueDate: '2026-06-05', amount: 64200, paidAmount: 32000, balanceDue: 32200, status: 'Partially Paid' },
  { id: 'INV-2026-0720', customer: 'GreenLine Contractors', issueDate: '2026-05-03', dueDate: '2026-06-02', amount: 27600, paidAmount: 0, balanceDue: 27600, status: 'Sent' },
]

const seedCustomers: Customer[] = [
  { id: 'CUS-1201', name: 'HarborWorks', contact: 'Sofia Bennett', email: 'sofia@harborworks.com', phone: '+1 617 555 0114', totalPurchases: 156900, outstandingBalance: 0, lastOrderDate: '2026-05-09', status: 'Active' },
  { id: 'CUS-1200', name: 'StoneBridge Developers', contact: 'Ethan Walsh', email: 'ethan@stonebridge.com', phone: '+1 212 555 0199', totalPurchases: 203450, outstandingBalance: 32200, lastOrderDate: '2026-05-06', status: 'Active' },
  { id: 'CUS-1199', name: 'GreenLine Contractors', contact: 'Ava Patel', email: 'ava@greenline.com', phone: '+1 312 555 0160', totalPurchases: 73200, outstandingBalance: 27600, lastOrderDate: '2026-05-03', status: 'Active' },
  { id: 'CUS-1198', name: 'NovaBuild', contact: 'Marcus King', email: 'marcus@novabuild.com', phone: '+1 213 555 0120', totalPurchases: 291700, outstandingBalance: 0, lastOrderDate: '2026-04-26', status: 'Active' },
]

const seedProducts: Product[] = [
  { id: 'PRD-501', name: 'WiseFlow Enterprise CRM', sku: 'WF-CRM-ENT', category: 'CRM', price: 24000, cost: 7600, stockStatus: 'In Stock', active: true },
  { id: 'PRD-502', name: 'Warehouse Automation Pack', sku: 'WF-WH-AUTO', category: 'Warehouse', price: 18500, cost: 9100, stockStatus: 'Low Stock', active: true },
  { id: 'PRD-503', name: 'Financial Controls Module', sku: 'WF-FIN-CTRL', category: 'Finance', price: 15200, cost: 4200, stockStatus: 'In Stock', active: true },
  { id: 'PRD-504', name: 'Procurement RFQ Suite', sku: 'WF-PRO-RFQ', category: 'Procurement', price: 12800, cost: 3900, stockStatus: 'In Stock', active: true },
  { id: 'PRD-505', name: 'Legacy Data Migration', sku: 'WF-SVC-MIG', category: 'Services', price: 9500, cost: 5200, stockStatus: 'In Stock', active: false },
]

const emptyForm: SalesForm = {
  customer: '',
  amount: '',
  salesRep: '',
  category: 'CRM',
  closeDate: new Date().toISOString().slice(0, 10),
}

const salesWorkspaceKey = 'wiseflow-sales-workspace'

function loadSalesWorkspace(companyId?: string): SalesWorkspaceData {
  const seeded = companyScopedSalesData(companyId)
  if (typeof window === 'undefined' || !companyId) return seeded

  try {
    const stored = window.localStorage.getItem(companyScopedKey(salesWorkspaceKey, companyId))
    if (!stored) return seeded
    const parsed = JSON.parse(stored) as Partial<SalesWorkspaceData>
    return {
      leads: normalizeCompanyRows(parsed.leads, companyId, seeded.leads),
      opportunities: normalizeCompanyRows(parsed.opportunities, companyId, seeded.opportunities),
      quotes: normalizeCompanyRows(parsed.quotes, companyId, seeded.quotes),
      orders: normalizeCompanyRows(parsed.orders, companyId, seeded.orders),
      invoices: normalizeCompanyRows(parsed.invoices, companyId, seeded.invoices),
      customers: normalizeCompanyRows(parsed.customers, companyId, seeded.customers),
      products: normalizeCompanyRows(parsed.products, companyId, seeded.products),
    }
  } catch {
    return seeded
  }
}

function saveSalesWorkspace(companyId: string, data: SalesWorkspaceData) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(companyScopedKey(salesWorkspaceKey, companyId), JSON.stringify(companyScopedSalesData(companyId, data)))
}

function companyScopedSalesData(companyId?: string, data?: SalesWorkspaceData): SalesWorkspaceData {
  const source = data || {
    leads: seedLeads,
    opportunities: seedOpportunities,
    quotes: seedQuotes,
    orders: seedOrders,
    invoices: seedInvoices,
    customers: seedCustomers,
    products: seedProducts,
  }
  return {
    leads: source.leads.map(item => ({ ...item, companyId })),
    opportunities: source.opportunities.map(item => ({ ...item, companyId })),
    quotes: source.quotes.map(item => ({ ...item, companyId })),
    orders: source.orders.map(item => ({ ...item, companyId })),
    invoices: source.invoices.map(item => ({ ...item, companyId })),
    customers: source.customers.map(item => ({ ...item, companyId })),
    products: source.products.map(item => ({ ...item, companyId })),
  }
}

function normalizeCompanyRows<T extends { companyId?: string }>(rows: T[] | undefined, companyId: string, fallback: T[]) {
  if (!Array.isArray(rows)) return fallback
  return rows.map(row => ({ ...row, companyId })).filter(row => row.companyId === companyId)
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [form, setForm] = useState<SalesForm>(emptyForm)
  const [notice, setNotice] = useState('')
  const [leads, setLeads] = useState(seedLeads)
  const [opportunities, setOpportunities] = useState(seedOpportunities)
  const [quotes, setQuotes] = useState(seedQuotes)
  const [orders, setOrders] = useState(seedOrders)
  const [invoices, setInvoices] = useState(seedInvoices)
  const [customers, setCustomers] = useState(seedCustomers)
  const [products, setProducts] = useState(seedProducts)
  const [activeCompany, setActiveCompany] = useState<CompanyRecord | null>(null)
  const storageReady = useRef(false)

  useEffect(() => {
    const loadWorkspace = () => {
      const company = getActiveCompany()
      setActiveCompany(company)
      const data = loadSalesWorkspace(company?.id)
      setLeads(data.leads)
      setOpportunities(data.opportunities)
      setQuotes(data.quotes)
      setOrders(data.orders)
      setInvoices(data.invoices)
      setCustomers(data.customers)
      setProducts(data.products)
      storageReady.current = true
    }

    loadWorkspace()
    window.addEventListener(companyChangeEvent, loadWorkspace)
    window.addEventListener('storage', loadWorkspace)
    return () => {
      window.removeEventListener(companyChangeEvent, loadWorkspace)
      window.removeEventListener('storage', loadWorkspace)
    }
  }, [])

  useEffect(() => {
    if (!storageReady.current || !activeCompany?.id) return
    saveSalesWorkspace(activeCompany.id, { leads, opportunities, quotes, orders, invoices, customers, products })
  }, [activeCompany?.id, customers, invoices, leads, opportunities, orders, products, quotes])

  const revenue = orders.reduce((sum, order) => sum + order.amount, 0)
  const paidRevenue = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0)
  const aov = revenue / Math.max(orders.length, 1)
  const conversion = Math.round((opportunities.filter(item => item.stage === 'Won').length / Math.max(opportunities.length, 1)) * 1000) / 10
  const filtered = useMemo(() => filterRows({ leads, opportunities, quotes, orders, invoices, customers, products }, activeTab, query), [activeTab, customers, invoices, leads, opportunities, orders, products, query, quotes])
  const repTotals = useMemo(() => totalBy(orders, order => order.salesRep), [orders])
  const categoryTotals = useMemo(() => totalBy(orders, order => order.productCategory), [orders])
  const pipeline = useMemo(() => buildPipeline(opportunities), [opportunities])
  const forecast = opportunities.filter(item => !['Won', 'Lost'].includes(item.stage)).reduce((sum, item) => sum + item.expectedValue * (item.probability / 100), 0)

  const createQuickOpportunity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(form.amount)
    if (!form.customer.trim() || !Number.isFinite(value) || value <= 0 || !form.salesRep.trim()) {
      setNotice('Complete customer, expected value, and sales rep before creating an opportunity.')
      return
    }

    const next: Opportunity = {
      id: nextCode('OP', opportunities.map(item => item.id)),
      companyId: activeCompany?.id,
      name: `${form.customer.trim()} sales opportunity`,
      customer: form.customer.trim(),
      expectedValue: value,
      probability: 35,
      stage: 'Qualified',
      expectedCloseDate: form.closeDate,
      salesRep: form.salesRep.trim(),
    }
    setOpportunities(current => [next, ...current])
    ensureCustomer(form.customer.trim(), form.salesRep.trim())
    setForm(emptyForm)
    setDrawerOpen(false)
    setNotice('Opportunity created and added to the sales pipeline.')
  }

  const qualifyLead = (lead: Lead) => {
    setLeads(current => current.map(item => item.id === lead.id ? { ...item, status: 'Qualified' } : item))
    setOpportunities(current => [{
      id: `OP-${lead.id.replace('LD-', '')}`,
      companyId: activeCompany?.id,
      name: lead.leadName,
      customer: lead.company,
      expectedValue: 42000,
      probability: 32,
      stage: 'Qualified',
      expectedCloseDate: '2026-06-30',
      salesRep: lead.salesRep,
    }, ...current])
    ensureCustomer(lead.company, lead.salesRep)
    setNotice(`${lead.company} moved from Lead to Opportunity.`)
  }

  const sendQuote = (quote: Quote) => {
    setQuotes(current => current.map(item => item.id === quote.id ? { ...item, status: 'Sent' } : item))
    setNotice(`${quote.id} marked as sent.`)
  }

  const convertQuote = (quote: Quote) => {
    const order: SalesOrder = {
      id: quote.id.replace('QT', 'SO'),
      companyId: activeCompany?.id,
      customer: quote.customer,
      orderDate: new Date().toISOString().slice(0, 10),
      deliveryDate: '2026-06-15',
      amount: quote.total,
      paymentStatus: 'Unpaid',
      deliveryStatus: 'Pending',
      salesRep: 'Emily Clark',
      productCategory: quote.items.includes('Inventory') ? 'Warehouse' : 'CRM',
    }
    setQuotes(current => current.map(item => item.id === quote.id ? { ...item, status: 'Accepted' } : item))
    setOrders(current => [order, ...current])
    ensureCustomer(quote.customer, 'Emily Clark', order.amount, order.orderDate)
    setNotice(`${quote.id} converted to ${order.id}.`)
  }

  const createInvoice = (order: SalesOrder) => {
    const id = order.id.replace('SO', 'INV')
    if (invoices.some(invoice => invoice.id === id)) {
      setNotice(`${id} already exists.`)
      return
    }
    setInvoices(current => [{
      id,
      companyId: activeCompany?.id,
      customer: order.customer,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: '2026-06-30',
      amount: order.amount,
      paidAmount: 0,
      balanceDue: order.amount,
      status: 'Draft',
    }, ...current])
    setNotice(`${id} created and ready in Financials.`)
  }

  const markInvoicePaid = (invoice: Invoice) => {
    setInvoices(current => current.map(item => item.id === invoice.id ? { ...item, paidAmount: item.amount, balanceDue: 0, status: 'Paid' } : item))
    setOrders(current => current.map(order => order.customer === invoice.customer && order.amount === invoice.amount ? { ...order, paymentStatus: 'Paid' } : order))
    setNotice(`${invoice.id} marked paid. Customer balance updated.`)
  }

  const updateDelivery = (order: SalesOrder) => {
    const nextStatus: Record<DeliveryStatus, DeliveryStatus> = { Pending: 'Picking', Picking: 'Packed', Packed: 'Delivered', Delivered: 'Delivered' }
    setOrders(current => current.map(item => item.id === order.id ? { ...item, deliveryStatus: nextStatus[item.deliveryStatus] } : item))
    setNotice(`${order.id} delivery moved to ${nextStatus[order.deliveryStatus]}. Warehouse inventory sync queued.`)
  }

  const ensureCustomer = (name: string, rep: string, amount = 0, orderDate = '') => {
    setCustomers(current => {
      const exists = current.find(customer => customer.name.toLowerCase() === name.toLowerCase())
      if (exists) {
        return current.map(customer => customer.id === exists.id ? { ...customer, totalPurchases: customer.totalPurchases + amount, lastOrderDate: orderDate || customer.lastOrderDate } : customer)
      }
      return [{
        id: nextCode('CUS', current.map(customer => customer.id)),
        companyId: activeCompany?.id,
        name,
        contact: rep,
        email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`,
        phone: '+1 555 0100',
        totalPurchases: amount,
        outstandingBalance: 0,
        lastOrderDate: orderDate || '-',
        status: 'Active',
      }, ...current]
    })
  }

  return (
    <div className="sales-page" style={{ fontFamily: font, display: 'grid', gap: 22, color: '#0f172a' }}>
      <PageHeader
        title="Sales"
        subtitle={`Manage the full sales workflow for ${activeCompany?.name || 'the selected company'} from lead capture to invoice, payment, delivery, and performance reporting.`}
        actions={(
          <>
            <ToolbarButton icon={<CalendarDays size={16} />} label="May 1 - May 31, 2026" hasChevron />
            <ToolbarButton icon={<Filter size={16} />} label="Filters" />
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNewMenuOpen(value => !value)} style={primaryButton}><Plus size={16} /> New <ChevronDown size={14} /></button>
              {newMenuOpen ? (
                <div style={newMenu}>
                  <button onClick={() => { setActiveTab('Leads'); setNewMenuOpen(false) }} style={newMenuItem}><UsersRound size={15} /> New lead</button>
                  <button onClick={() => { setDrawerOpen(true); setNewMenuOpen(false) }} style={newMenuItem}><ShoppingBag size={15} /> New opportunity</button>
                  <button onClick={() => { setActiveTab('Quotes'); setNewMenuOpen(false) }} style={newMenuItem}><ReceiptText size={15} /> New quote</button>
                </div>
              ) : null}
            </div>
            <ToolbarButton icon={<Download size={16} />} label="Export" />
          </>
        )}
      />

      {notice ? <div style={successBox}>{notice}<button onClick={() => setNotice('')} style={dismissButton}><X size={14} /></button></div> : null}

      <WorkflowStrip />

      <div className="sales-metric-grid" style={metricGrid}>
        <MetricCard icon={<CircleDollarSign size={23} />} label="Total Revenue" value={money(revenue)} detail={`${money(paidRevenue)} collected`} tone="#16a34a" />
        <MetricCard icon={<ShoppingBag size={23} />} label="Total Orders" value={String(orders.length)} detail={`${orders.filter(item => item.deliveryStatus !== 'Delivered').length} open deliveries`} tone="#2563eb" />
        <MetricCard icon={<BarChart3 size={23} />} label="Average Order Value" value={money(aov)} detail="Across confirmed orders" tone="#7c3aed" />
        <MetricCard icon={<UserRound size={23} />} label="Total Customers" value={String(customers.length)} detail={`${customers.filter(item => item.status === 'Active').length} active accounts`} tone="#f59e0b" />
        <MetricCard icon={<Funnel size={23} />} label="Conversion Rate" value={`${conversion}%`} detail={`${money(forecast)} forecast pipeline`} tone="#14b8a6" />
      </div>

      <div style={tabsStyle}>
        {tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>{tab}</button>)}
      </div>

      {activeTab === 'Overview' ? (
        <Overview
          orders={orders}
          invoices={invoices}
          reps={repTotals}
          categories={categoryTotals}
          pipeline={pipeline}
          onCreateInvoice={createInvoice}
        />
      ) : (
        <Panel title={activeTab} action={<SearchFilter search={query} setSearch={setQuery} />}>
          {activeTab === 'Leads' && <LeadsTab leads={filtered.leads} onQualify={qualifyLead} />}
          {activeTab === 'Opportunities' && <OpportunitiesTab opportunities={filtered.opportunities} />}
          {activeTab === 'Quotes' && <QuotesTab quotes={filtered.quotes} onSend={sendQuote} onConvert={convertQuote} />}
          {activeTab === 'Sales Orders' && <OrdersTab orders={filtered.orders} onCreateInvoice={createInvoice} onUpdateDelivery={updateDelivery} />}
          {activeTab === 'Invoices' && <InvoicesTab invoices={filtered.invoices} onMarkPaid={markInvoicePaid} />}
          {activeTab === 'Customers' && <CustomersTab customers={filtered.customers} />}
          {activeTab === 'Products' && <ProductsTab products={filtered.products} setProducts={setProducts} />}
          {activeTab === 'Sales Analytics' && <AnalyticsTab orders={orders} opportunities={opportunities} products={products} customers={customers} />}
        </Panel>
      )}

      <IntegrationRail />

      {drawerOpen ? (
        <div style={overlay}>
          <form onSubmit={createQuickOpportunity} style={drawer}>
            <div style={drawerHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Create Opportunity</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>Start a qualified deal and attach it to the WiseFlow sales pipeline.</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} style={iconButton}><X size={18} /></button>
            </div>
            <div style={formGrid}>
              <TextField label="Customer" value={form.customer} onChange={value => setForm(current => ({ ...current, customer: value }))} required />
              <TextField label="Expected Value" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" prefix="$" required />
              <SelectField label="Sales Rep" value={form.salesRep} onChange={value => setForm(current => ({ ...current, salesRep: value }))} options={reps} required />
              <SelectField label="Category" value={form.category} onChange={value => setForm(current => ({ ...current, category: value }))} options={['CRM', 'ERP Platform', 'Warehouse', 'Procurement', 'HR Suite', 'Services']} />
              <TextField label="Expected Close Date" value={form.closeDate} onChange={value => setForm(current => ({ ...current, closeDate: value }))} type="date" />
            </div>
            <div style={drawerFooter}>
              <button type="button" onClick={() => setDrawerOpen(false)} style={secondaryButton}>Cancel</button>
              <button type="submit" style={primaryButton}>Save Opportunity</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function Overview({ orders, invoices, reps, categories, pipeline, onCreateInvoice }: { orders: SalesOrder[]; invoices: Invoice[]; reps: { label: string; amount: number; count: number }[]; categories: { label: string; amount: number; count: number }[]; pipeline: { stage: OpportunityStage; count: number; amount: number }[]; onCreateInvoice: (order: SalesOrder) => void }) {
  return (
    <>
      <div className="sales-top-grid" style={topGrid}>
        <Panel title="Sales Performance" action={<select style={miniSelect}><option>By Month</option></select>}>
          <PerformanceChart orders={orders} />
        </Panel>
        <Panel title="Sales Pipeline" action={<select style={miniSelect}><option>This Month</option></select>}>
          <Pipeline stages={pipeline} />
        </Panel>
        <Panel title="Top Sales Reps" action={<a style={viewAll}>View All</a>}>
          <div style={{ display: 'grid', gap: 14 }}>{reps.slice(0, 5).map((rep, index) => <SalesRep key={rep.label} rep={rep} index={index} />)}</div>
        </Panel>
      </div>
      <div className="sales-bottom-grid" style={bottomGrid}>
        <Panel title="Recent Sales Orders" action={<a style={viewAll}>View All</a>}>
          <OrdersTab orders={orders.slice(0, 6)} onCreateInvoice={onCreateInvoice} compact />
        </Panel>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Panel title="Revenue by Product Category" action={<a style={viewAll}>View All</a>}>
            <CategoryRevenue categories={categories} />
          </Panel>
          <Panel title="Recent Invoices" action={<a style={viewAll}>View All</a>}>
            <InvoicesTab invoices={invoices.slice(0, 5)} compact />
          </Panel>
        </div>
      </div>
    </>
  )
}

function WorkflowStrip() {
  const steps = ['Lead', 'Opportunity', 'Quote', 'Sales Order', 'Invoice', 'Payment', 'Delivery']
  return (
    <div className="sales-workflow-strip" style={workflowStrip}>
      {steps.map((step, index) => (
        <div key={step} className="sales-workflow-step" style={workflowStep}>
          <span style={workflowNumber}>{index + 1}</span>
          <span>{step}</span>
        </div>
      ))}
    </div>
  )
}

function LeadsTab({ leads, onQualify }: { leads: Lead[]; onQualify: (lead: Lead) => void }) {
  return <DataTable headers={['Lead name', 'Company', 'Contact', 'Email', 'Phone', 'Source', 'Status', 'Assigned rep', 'Created', 'Actions']}>
    {leads.map(lead => <tr key={lead.id}>
      <Cell strong>{lead.leadName}</Cell><Cell>{lead.company}</Cell><Cell>{lead.contact}</Cell><Cell>{lead.email}</Cell><Cell>{lead.phone}</Cell><Cell>{lead.source}</Cell><Cell><Badge text={lead.status} /></Cell><Cell>{lead.salesRep}</Cell><Cell>{date(lead.createdDate)}</Cell>
      <Cell>{lead.status !== 'Qualified' && lead.status !== 'Lost' ? <button onClick={() => onQualify(lead)} style={smallButton}>Qualify</button> : <button style={iconButton}><MoreHorizontal size={15} /></button>}</Cell>
    </tr>)}
  </DataTable>
}

function OpportunitiesTab({ opportunities }: { opportunities: Opportunity[] }) {
  return <DataTable headers={['Opportunity', 'Customer', 'Expected value', 'Probability', 'Stage', 'Expected close', 'Sales rep', 'Forecast']}>
    {opportunities.map(item => <tr key={item.id}>
      <Cell strong>{item.name}</Cell><Cell>{item.customer}</Cell><Cell>{money(item.expectedValue)}</Cell><Cell>{item.probability}%</Cell><Cell><Badge text={item.stage} /></Cell><Cell>{date(item.expectedCloseDate)}</Cell><Cell>{item.salesRep}</Cell><Cell>{money(item.expectedValue * (item.probability / 100))}</Cell>
    </tr>)}
  </DataTable>
}

function QuotesTab({ quotes, onSend, onConvert }: { quotes: Quote[]; onSend: (quote: Quote) => void; onConvert: (quote: Quote) => void }) {
  return <DataTable headers={['Quote #', 'Customer', 'Items/services', 'Subtotal', 'Discount', 'Tax', 'Total', 'Valid until', 'Status', 'Actions']}>
    {quotes.map(quote => <tr key={quote.id}>
      <Cell strong>{quote.id}</Cell><Cell>{quote.customer}</Cell><Cell>{quote.items}</Cell><Cell>{money(quote.subtotal)}</Cell><Cell>{money(quote.discount)}</Cell><Cell>{money(quote.tax)}</Cell><Cell strong>{money(quote.total)}</Cell><Cell>{date(quote.validUntil)}</Cell><Cell><Badge text={quote.status} /></Cell>
      <Cell><ActionGroup actions={[['Send', () => onSend(quote), Send], ['PDF', () => null, Download], ['Convert', () => onConvert(quote), CheckCircle2]]} /></Cell>
    </tr>)}
  </DataTable>
}

function OrdersTab({ orders, onCreateInvoice, onUpdateDelivery, compact }: { orders: SalesOrder[]; onCreateInvoice: (order: SalesOrder) => void; onUpdateDelivery?: (order: SalesOrder) => void; compact?: boolean }) {
  return <DataTable headers={compact ? ['Order #', 'Customer', 'Amount', 'Payment', 'Delivery', 'Actions'] : ['Sales order #', 'Customer', 'Order date', 'Delivery date', 'Amount', 'Payment status', 'Delivery status', 'Sales rep', 'Actions']}>
    {orders.map(order => <tr key={order.id}>
      <Cell strong>{order.id}</Cell><Cell>{order.customer}</Cell>{!compact && <Cell>{date(order.orderDate)}</Cell>}{!compact && <Cell>{date(order.deliveryDate)}</Cell>}<Cell strong>{money(order.amount)}</Cell><Cell><Badge text={order.paymentStatus} /></Cell><Cell><Badge text={order.deliveryStatus} /></Cell>{!compact && <Cell>{order.salesRep}</Cell>}
      <Cell><ActionGroup actions={[['Invoice', () => onCreateInvoice(order), FileText], ['Delivery', () => onUpdateDelivery?.(order), Truck]]} /></Cell>
    </tr>)}
  </DataTable>
}

function InvoicesTab({ invoices, onMarkPaid, compact }: { invoices: Invoice[]; onMarkPaid?: (invoice: Invoice) => void; compact?: boolean }) {
  return <DataTable headers={compact ? ['Invoice #', 'Customer', 'Amount', 'Status'] : ['Invoice #', 'Customer', 'Issue date', 'Due date', 'Amount', 'Paid amount', 'Balance due', 'Status', 'Actions']}>
    {invoices.map(invoice => <tr key={invoice.id}>
      <Cell strong>{invoice.id}</Cell><Cell>{invoice.customer}</Cell>{!compact && <Cell>{date(invoice.issueDate)}</Cell>}{!compact && <Cell>{date(invoice.dueDate)}</Cell>}<Cell strong>{money(invoice.amount)}</Cell>{!compact && <Cell>{money(invoice.paidAmount)}</Cell>}{!compact && <Cell>{money(invoice.balanceDue)}</Cell>}<Cell><Badge text={invoice.status} /></Cell>
      {!compact && <Cell>{invoice.status !== 'Paid' ? <button onClick={() => onMarkPaid?.(invoice)} style={smallButton}>Mark paid</button> : <button style={iconButton}><MoreHorizontal size={15} /></button>}</Cell>}
    </tr>)}
  </DataTable>
}

function CustomersTab({ customers }: { customers: Customer[] }) {
  return <DataTable headers={['Customer/company', 'Contact person', 'Email', 'Phone', 'Total purchases', 'Outstanding balance', 'Last order date', 'Status']}>
    {customers.map(customer => <tr key={customer.id}>
      <Cell strong>{customer.name}</Cell><Cell>{customer.contact}</Cell><Cell>{customer.email}</Cell><Cell>{customer.phone}</Cell><Cell>{money(customer.totalPurchases)}</Cell><Cell>{money(customer.outstandingBalance)}</Cell><Cell>{date(customer.lastOrderDate)}</Cell><Cell><Badge text={customer.status} /></Cell>
    </tr>)}
  </DataTable>
}

function ProductsTab({ products, setProducts }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  return <DataTable headers={['Product/service', 'SKU', 'Category', 'Price', 'Cost', 'Margin', 'Stock status', 'Active', 'Actions']}>
    {products.map(product => <tr key={product.id}>
      <Cell strong>{product.name}</Cell><Cell>{product.sku}</Cell><Cell>{product.category}</Cell><Cell>{money(product.price)}</Cell><Cell>{money(product.cost)}</Cell><Cell>{Math.round(((product.price - product.cost) / product.price) * 100)}%</Cell><Cell><Badge text={product.stockStatus} /></Cell><Cell>{product.active ? 'Active' : 'Inactive'}</Cell>
      <Cell><button onClick={() => setProducts(current => current.map(item => item.id === product.id ? { ...item, active: !item.active } : item))} style={smallButton}>{product.active ? 'Disable' : 'Enable'}</button></Cell>
    </tr>)}
  </DataTable>
}

function AnalyticsTab({ orders, opportunities, products, customers }: { orders: SalesOrder[]; opportunities: Opportunity[]; products: Product[]; customers: Customer[] }) {
  const byCustomer = totalBy(orders, order => order.customer)
  const byRep = totalBy(orders, order => order.salesRep)
  const byCategory = totalBy(orders, order => order.productCategory)
  const lostReasons = opportunities.filter(item => item.stage === 'Lost').map(item => item.lostReason || 'No reason captured')
  const forecast = opportunities.filter(item => !['Won', 'Lost'].includes(item.stage)).reduce((sum, item) => sum + item.expectedValue * (item.probability / 100), 0)
  return (
    <div style={analyticsGrid}>
      <InsightCard title="Revenue Trend" value={money(orders.reduce((sum, item) => sum + item.amount, 0))} body="Rolling order revenue from confirmed sales orders." icon={BarChart3} />
      <InsightCard title="Conversion Trend" value={`${Math.round((opportunities.filter(item => item.stage === 'Won').length / Math.max(opportunities.length, 1)) * 100)}%`} body="Won opportunities against active pipeline." icon={Funnel} />
      <InsightList title="Sales by Rep" items={byRep.map(item => [item.label, money(item.amount)])} />
      <InsightList title="Sales by Customer" items={byCustomer.map(item => [item.label, money(item.amount)])} />
      <InsightList title="Sales by Product / Category" items={byCategory.map(item => [item.label, money(item.amount)])} />
      <InsightCard title="Pipeline Forecast" value={money(forecast)} body="Probability-weighted pipeline forecast." icon={CircleDollarSign} />
      <InsightList title="Lost Deal Reasons" items={lostReasons.map(reason => [reason, 'Review'])} />
      <InsightCard title="Product Margin" value={`${Math.round(products.reduce((sum, item) => sum + ((item.price - item.cost) / item.price), 0) / Math.max(products.length, 1) * 100)}%`} body={`${customers.length} customer accounts tied to sales analytics.`} icon={Package} />
    </div>
  )
}

function IntegrationRail() {
  const items = [
    ['Financials', 'Confirmed sales orders can create customer invoices.'],
    ['Warehouse', 'Sold products reserve stock and update delivery status.'],
    ['Procurement', 'Low stock products can trigger purchase requests.'],
    ['HR', 'Sales reps connect to performance and commission tracking.'],
    ['Reports', 'Sales reports feed revenue, pipeline, and customer analytics.'],
  ]
  return (
    <section style={integrationPanel}>
      <h2 style={panelTitle}>WiseFlow ERP integrations</h2>
      <div style={integrationGrid}>
        {items.map(([title, body], index) => <div key={title} style={integrationItem}>
          <span style={softIcon(['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#14b8a6'][index], 36)}>{index === 1 ? <Warehouse size={18} /> : index === 2 ? <Package size={18} /> : <CheckCircle2 size={18} />}</span>
          <div><strong>{title}</strong><p>{body}</p></div>
        </div>)}
      </div>
    </section>
  )
}

function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table style={tableStyle}>
        <thead><tr>{headers.map(header => <th key={header} style={thStyle}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Cell({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <td style={{ ...tdStyle, fontWeight: strong ? 900 : 650 }}>{children}</td>
}

function ActionGroup({ actions }: { actions: [string, () => void, React.ComponentType<{ size?: number }>][] }) {
  return <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{actions.map(([label, action, Icon]) => <button key={label} onClick={action} style={smallButton}><Icon size={13} />{label}</button>)}</div>
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section style={panel}>
      <div style={panelHeader}><h2 style={panelTitle}>{title}</h2>{action}</div>
      {children}
    </section>
  )
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions: ReactNode }) {
  return <div style={pageHeader}><div><h1 style={h1}>{title}</h1><p style={subtitleStyle}>{subtitle}</p></div><div style={actionsWrap}>{actions}</div></div>
}

function MetricCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <div className="sales-metric-card" style={metricCard}><span className="sales-metric-icon" style={softIcon(tone)}>{icon}</span><div style={{ minWidth: 0 }}><div className="sales-stat-label" style={statLabel}>{label}</div><div className="sales-stat-value" style={statValue}>{value}</div><div className="sales-stat-detail" style={statDetail}>{detail}</div></div></div>
}

function PerformanceChart({ orders }: { orders: SalesOrder[] }) {
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
  const values = [35, 54, 46, 62, 70, Math.min(100, Math.max(35, orders.reduce((sum, item) => sum + item.amount, 0) / 2200))]
  return <div style={{ padding: '8px 12px 24px' }}><div style={chartArea}>{months.map((month, index) => <div key={month} style={chartColumn}><div style={{ ...bar, height: `${values[index]}%` }} /><small style={chartLabel}>{month}</small></div>)}</div></div>
}

function Pipeline({ stages }: { stages: { stage: OpportunityStage; count: number; amount: number }[] }) {
  const max = Math.max(...stages.map(item => item.amount), 1)
  return <div className="sales-pipeline" style={pipelineGrid}>{stages.map((item, index) => <div key={item.stage} className="sales-pipeline-row" style={{ display: 'contents' }}>
    <div style={pipelineLabel}><i style={legendDot(['#2563eb', '#60a5fa', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'][index])} />{item.stage}<strong>{item.count}</strong></div>
    <span style={{ ...funnelBar, width: `${Math.max((item.amount / max) * 100, 18)}%`, background: ['#2563eb', '#60a5fa', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'][index] }} />
    <strong style={{ textAlign: 'right' }}>{money(item.amount)}</strong>
  </div>)}</div>
}

function SalesRep({ rep, index }: { rep: { label: string; amount: number; count: number }; index: number }) {
  const colors = ['#4f46e5', '#f97316', '#ef4444', '#2563eb', '#10b981']
  return <div style={repRow}><span style={{ ...avatarStyle, background: colors[index % colors.length] }}>{initials(rep.label)}</span><div style={{ flex: 1 }}><strong>{rep.label}</strong><span>{money(rep.amount)}</span></div><b style={dealPill}>{rep.count} Deals</b></div>
}

function CategoryRevenue({ categories }: { categories: { label: string; amount: number; count: number }[] }) {
  const total = categories.reduce((sum, item) => sum + item.amount, 0)
  return <div className="category-revenue" style={categoryLayout}><div style={donut}><strong>{money(total)}</strong><span>Total Revenue</span></div><div style={{ display: 'grid', gap: 12 }}>{categories.map((item, index) => <div key={item.label} style={categoryRow}><span><i style={legendDot(['#16a34a', '#2563eb', '#8b5cf6', '#f59e0b'][index % 4])} />{item.label}</span><strong>{money(item.amount)}</strong></div>)}</div></div>
}

function InsightCard({ title, value, body, icon: Icon }: { title: string; value: string; body: string; icon: React.ComponentType<{ size?: number }> }) {
  return <section style={insightCard}><span style={softIcon(green, 42)}><Icon size={20} /></span><div><h3>{title}</h3><strong>{value}</strong><p>{body}</p></div></section>
}

function InsightList({ title, items }: { title: string; items: [string, string][] }) {
  return <section style={insightCard}><h3>{title}</h3><div style={{ display: 'grid', gap: 10 }}>{items.slice(0, 5).map(([label, value]) => <div key={label} style={listRow}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
}

function SearchFilter({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return <label style={searchBox}><Search size={15} color="#64748b" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search sales..." style={bareInput} /></label>
}

function ToolbarButton({ icon, label, hasChevron }: { icon: ReactNode; label: string; hasChevron?: boolean }) {
  return <button style={secondaryButton}>{icon}{label}{hasChevron ? <ChevronDown size={14} /> : null}</button>
}

function TextField({ label, value, onChange, required, type = 'text', prefix }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; prefix?: string }) {
  return <label style={fieldWrap}><span style={labelStyle}>{label}{required ? <b> *</b> : null}</span><span style={{ position: 'relative' }}>{prefix ? <span style={prefixStyle}>{prefix}</span> : null}<input type={type} value={value} onChange={event => onChange(event.target.value)} style={{ ...inputStyle, paddingLeft: prefix ? 42 : 12 }} /></span></label>
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return <label style={fieldWrap}><span style={labelStyle}>{label}{required ? <b> *</b> : null}</span><select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>{options.map(option => <option key={option}>{option}</option>)}</select></label>
}

function Badge({ text }: { text: string }) {
  const color = text.includes('Paid') || text === 'Won' || text === 'Qualified' || text === 'Active' || text === 'Delivered' || text === 'Accepted' ? ['#dcfce7', '#15803d'] : text.includes('Lost') || text === 'Cancelled' || text === 'Overdue' || text === 'Out of Stock' ? ['#fee2e2', '#dc2626'] : text === 'Low Stock' || text === 'Negotiation' || text === 'Sent' ? ['#fef3c7', '#b45309'] : ['#dbeafe', '#1d4ed8']
  return <span style={{ background: color[0], color: color[1], borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 850, whiteSpace: 'nowrap' }}>{text}</span>
}

function totalBy<T>(rows: T[], pick: (row: T) => string) {
  const map = new Map<string, { label: string; amount: number; count: number }>()
  rows.forEach(row => {
    const label = pick(row)
    const amount = 'amount' in (row as object) ? Number((row as { amount?: number }).amount || 0) : 0
    const current = map.get(label) || { label, amount: 0, count: 0 }
    current.amount += amount
    current.count += 1
    map.set(label, current)
  })
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
}

function buildPipeline(opportunities: Opportunity[]) {
  return (['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as OpportunityStage[]).map(stage => {
    const rows = opportunities.filter(item => item.stage === stage)
    return { stage, count: rows.length, amount: rows.reduce((sum, item) => sum + item.expectedValue, 0) }
  })
}

function filterRows(data: { leads: Lead[]; opportunities: Opportunity[]; quotes: Quote[]; orders: SalesOrder[]; invoices: Invoice[]; customers: Customer[]; products: Product[] }, activeTab: string, query: string) {
  const q = query.trim().toLowerCase()
  const filter = <T,>(rows: T[]) => !q ? rows : rows.filter(row => JSON.stringify(row).toLowerCase().includes(q))
  return { leads: filter(data.leads), opportunities: filter(data.opportunities), quotes: filter(data.quotes), orders: filter(data.orders), invoices: filter(data.invoices), customers: filter(data.customers), products: filter(data.products) }
}

function nextCode(prefix: string, ids: string[]) {
  const next = ids.reduce((max, id) => {
    const number = Number(id.replace(/\D/g, ''))
    return Number.isFinite(number) ? Math.max(max, number) : max
  }, 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function date(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'WF'
}

const pageHeader: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', minWidth: 0 }
const h1: CSSProperties = { margin: 0, fontSize: 30, lineHeight: 1.08, fontWeight: 900, color: '#020617', letterSpacing: 0 }
const subtitleStyle: CSSProperties = { margin: '7px 0 0', fontSize: 14, color: '#475569', fontWeight: 500, maxWidth: 740 }
const actionsWrap: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
const primaryButton: CSSProperties = { height: 38, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '0 15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 850, cursor: 'pointer', textDecoration: 'none' }
const secondaryButton: CSSProperties = { height: 38, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', borderRadius: 8, padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }
const workflowStrip: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }
const workflowStep: CSSProperties = { minHeight: 48, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', fontSize: 12, fontWeight: 850 }
const workflowNumber: CSSProperties = { width: 24, height: 24, borderRadius: 999, background: '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: 11 }
const metricGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, minWidth: 0 }
const metricCard: CSSProperties = { minHeight: 118, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 28px rgba(15,23,42,.04)', minWidth: 0 }
const statLabel: CSSProperties = { color: '#475569', fontSize: 13, fontWeight: 750 }
const statValue: CSSProperties = { color: '#020617', fontSize: 24, fontWeight: 900, marginTop: 6, overflowWrap: 'anywhere' }
const statDetail: CSSProperties = { color: green, fontSize: 12, fontWeight: 750, marginTop: 8 }
const tabsStyle: CSSProperties = { display: 'flex', gap: 26, borderBottom: '1px solid #e2e8f0', overflowX: 'auto', minWidth: 0 }
const topGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, .95fr) minmax(250px, .78fr)', gap: 16, minWidth: 0 }
const bottomGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, .72fr)', gap: 16, minWidth: 0 }
const panel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,.04)', overflow: 'hidden', minWidth: 0 }
const panelHeader: CSSProperties = { minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 18px', borderBottom: '1px solid #eef2f7', minWidth: 0 }
const panelTitle: CSSProperties = { margin: 0, color: '#020617', fontSize: 15, fontWeight: 900 }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 920 }
const thStyle: CSSProperties = { padding: '13px 14px', color: '#475569', background: '#f8fafc', fontSize: 11, fontWeight: 900, textAlign: 'left', whiteSpace: 'nowrap' }
const tdStyle: CSSProperties = { padding: '13px 14px', borderTop: '1px solid #edf2f7', color: '#0f172a', fontSize: 12, whiteSpace: 'nowrap' }
const viewAll: CSSProperties = { color: '#2563eb', fontSize: 12, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }
const miniSelect: CSSProperties = { height: 34, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 10px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 750 }
const searchBox: CSSProperties = { height: 34, width: 'min(240px, 48vw)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff' }
const bareInput: CSSProperties = { border: 0, outline: 0, minWidth: 0, flex: 1, fontSize: 12, background: 'transparent', color: '#0f172a' }
const smallButton: CSSProperties = { minHeight: 30, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', borderRadius: 7, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 850, cursor: 'pointer' }
const iconButton: CSSProperties = { width: 34, height: 34, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', color: '#334155', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const chartArea: CSSProperties = { height: 230, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(38px, 1fr))', gap: 16, alignItems: 'end', padding: '18px 10px 0', borderBottom: '1px solid #e2e8f0', background: 'repeating-linear-gradient(to top, transparent 0 44px, #eef2f7 45px)', overflowX: 'auto' }
const chartColumn: CSSProperties = { height: '100%', display: 'grid', alignItems: 'end', justifyItems: 'center', position: 'relative' }
const bar: CSSProperties = { width: 24, minHeight: 20, borderRadius: '7px 7px 0 0', background: 'linear-gradient(180deg, #22c55e, #15803d)' }
const chartLabel: CSSProperties = { position: 'absolute', bottom: -24, color: '#64748b', fontSize: 11, fontWeight: 700 }
const pipelineGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(90px, 130px) minmax(90px, 1fr) minmax(110px, 130px)', gap: 12, alignItems: 'center', padding: 18 }
const pipelineLabel: CSSProperties = { display: 'grid', gap: 4, color: '#475569', fontSize: 12, fontWeight: 750 }
const funnelBar: CSSProperties = { height: 34, borderRadius: 7, clipPath: 'polygon(8% 0, 92% 0, 80% 100%, 20% 100%)', justifySelf: 'center' }
const repRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }
const avatarStyle: CSSProperties = { width: 32, height: 32, borderRadius: 999, background: '#2563eb', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flex: '0 0 auto' }
const dealPill: CSSProperties = { background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 850, whiteSpace: 'nowrap' }
const categoryLayout: CSSProperties = { display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', alignItems: 'center', gap: 22, padding: 18 }
const donut: CSSProperties = { width: 140, height: 140, borderRadius: '50%', background: 'conic-gradient(#16a34a 0 40%, #2563eb 40% 70%, #8b5cf6 70% 90%, #f59e0b 90% 100%)', display: 'grid', placeItems: 'center', position: 'relative', color: '#0f172a', textAlign: 'center', fontSize: 12 }
const categoryRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, minWidth: 0 }
const analyticsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, padding: 18 }
const insightCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, display: 'grid', gap: 10, alignContent: 'start' }
const listRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569', fontSize: 13 }
const integrationPanel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }
const integrationGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }
const integrationItem: CSSProperties = { display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid #eef2f7', borderRadius: 9, padding: 12, color: '#475569', fontSize: 12 }
const successBox: CSSProperties = { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 800, display: 'flex', justifyContent: 'space-between', gap: 12 }
const dismissButton: CSSProperties = { border: 0, background: 'transparent', color: '#166534', cursor: 'pointer', display: 'grid', placeItems: 'center' }
const newMenu: CSSProperties = { position: 'absolute', right: 0, top: 44, zIndex: 10, width: 190, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 18px 40px rgba(15,23,42,.16)', padding: 6 }
const newMenuItem: CSSProperties = { width: '100%', border: 0, background: 'transparent', borderRadius: 6, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 9, color: '#0f172a', fontSize: 13, fontWeight: 750, cursor: 'pointer' }
const overlay: CSSProperties = { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15,23,42,.28)', display: 'flex', justifyContent: 'flex-end' }
const drawer: CSSProperties = { width: 'min(520px, 100vw)', height: '100%', background: '#fff', boxShadow: '-24px 0 50px rgba(15,23,42,.2)', display: 'grid', gridTemplateRows: 'auto 1fr auto', overflowY: 'auto' }
const drawerHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, padding: 28, borderBottom: '1px solid #e2e8f0' }
const formGrid: CSSProperties = { display: 'grid', gap: 16, padding: 28 }
const fieldWrap: CSSProperties = { display: 'grid', gap: 8, minWidth: 0 }
const labelStyle: CSSProperties = { color: '#334155', fontSize: 13, fontWeight: 850 }
const inputStyle: CSSProperties = { width: '100%', height: 42, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 12px', color: '#0f172a', fontSize: 13, fontWeight: 650, outline: 'none', background: '#fff', boxSizing: 'border-box' }
const prefixStyle: CSSProperties = { position: 'absolute', left: 12, top: 12, color: '#64748b', fontSize: 13, fontWeight: 850 }
const drawerFooter: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 28, borderTop: '1px solid #e2e8f0' }

const softIcon = (color: string, size = 54): CSSProperties => ({ width: size, height: size, borderRadius: 14, background: `${color}16`, color, display: 'grid', placeItems: 'center', flex: '0 0 auto' })
const tabStyle = (active: boolean): CSSProperties => ({ border: 0, background: 'transparent', padding: '0 0 13px', margin: 0, color: active ? green : '#334155', borderBottom: active ? `2px solid ${green}` : '2px solid transparent', fontSize: 13, fontWeight: active ? 900 : 750, cursor: 'pointer', whiteSpace: 'nowrap' })
const legendDot = (color: string): CSSProperties => ({ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block', marginRight: 8 })
