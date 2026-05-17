'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock3, GitCompareArrows, PackageSearch, Search, Star, Trophy, UsersRound } from 'lucide-react'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const suppliersKey = 'flowsys-suppliers'
const pricebookKey = 'flowsys-pricebook-items'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'
const rfqsKey = 'flowsys-procurement-rfqs'
const receivingKey = 'flowsys-procurement-receiving'

type StoredRow = Record<string, unknown>

type SupplierComparison = {
  id: string
  name: string
  category: string
  email: string
  rating: number
  deliveryRating: number
  totalSpend: number
  rfqCount: number
  receivedCount: number
  avgLeadTime: number
  status: string
}

type PriceComparison = {
  item: string
  category: string
  offers: Array<{
    supplier: string
    price: number
    cost: number
    leadTime: string
    paymentTerms: string
  }>
}

export default function ProcurementVendorComparisonPage() {
  const [companyId, setCompanyId] = useState('')
  const [suppliers, setSuppliers] = useState<StoredRow[]>([])
  const [pricebook, setPricebook] = useState<StoredRow[]>([])
  const [orders, setOrders] = useState<StoredRow[]>([])
  const [rfqs, setRfqs] = useState<StoredRow[]>([])
  const [receiving, setReceiving] = useState<StoredRow[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = () => {
      const activeCompanyId = getActiveCompany()?.id || ''
      setCompanyId(activeCompanyId)
      setSuppliers(loadRows(suppliersKey, activeCompanyId))
      setPricebook(loadRows(pricebookKey, activeCompanyId))
      setOrders(loadRows(purchaseOrdersKey, activeCompanyId))
      setRfqs(loadRows(rfqsKey, activeCompanyId))
      setReceiving(loadRows(receivingKey, activeCompanyId))
    }
    load()
    window.addEventListener(companyChangeEvent, load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener(companyChangeEvent, load)
      window.removeEventListener('storage', load)
    }
  }, [])

  const comparisons = useMemo(() => buildSupplierComparisons(suppliers, orders, rfqs, receiving), [orders, receiving, rfqs, suppliers])
  const itemComparisons = useMemo(() => buildItemComparisons(pricebook), [pricebook])
  const filteredSuppliers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return comparisons
    return comparisons.filter(supplier => [
      supplier.name,
      supplier.category,
      supplier.email,
      supplier.status,
    ].some(value => value.toLowerCase().includes(needle)))
  }, [comparisons, search])

  const bestBySpend = comparisons.slice().sort((a, b) => b.totalSpend - a.totalSpend)[0]
  const bestByRating = comparisons.slice().sort((a, b) => b.rating - a.rating)[0]
  const fastest = comparisons.filter(item => item.avgLeadTime > 0).slice().sort((a, b) => a.avgLeadTime - b.avgLeadTime)[0]

  return (
    <main className="vendor-comparison" style={{ fontFamily: font }}>
      <style>{comparisonCss}</style>
      <header className="vendor-comparison-header">
        <div>
          <div className="vendor-comparison-breadcrumb"><span>Procurement</span><span>/</span><strong>Vendor Comparison</strong></div>
          <div className="vendor-comparison-title">
            <span><GitCompareArrows size={20} /></span>
            <div>
              <h1>Vendor Comparison</h1>
              <p>Compare suppliers by price, lead time, RFQ participation, spend, and delivery performance.</p>
            </div>
          </div>
        </div>
        <label className="vendor-comparison-search">
          <Search size={16} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search suppliers, categories, status..." />
        </label>
      </header>

      <section className="vendor-comparison-kpis" aria-label="Supplier comparison metrics">
        <Kpi icon={UsersRound} title="Comparable Suppliers" value={String(comparisons.length)} helper={companyId ? 'From active company records' : 'From saved records'} />
        <Kpi icon={PackageSearch} title="Comparable Items" value={String(itemComparisons.length)} helper="Items with supplier pricing" />
        <Kpi icon={Trophy} title="Highest Spend Supplier" value={bestBySpend?.name || '-'} helper={bestBySpend ? formatCurrency(bestBySpend.totalSpend) : 'No purchase orders yet'} />
        <Kpi icon={Clock3} title="Fastest Lead Time" value={fastest ? `${fastest.avgLeadTime.toFixed(1)} days` : '-'} helper={fastest?.name || 'No receiving lead time yet'} />
      </section>

      <section className="vendor-comparison-guide">
        <strong>Guide rule</strong>
        <p>Supplier comparison happens before awarding a supplier. Use pricing, speed, ratings, and delivery performance together instead of choosing by cost alone.</p>
      </section>

      <div className="vendor-comparison-grid">
        <section className="vendor-comparison-card">
          <div className="vendor-comparison-card-head">
            <h2>Supplier Scoreboard</h2>
            <Link href="/supplier-database">Open Supplier Database <ArrowRight size={14} /></Link>
          </div>
          {filteredSuppliers.length ? (
            <div className="vendor-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Delivery</th>
                    <th>RFQs</th>
                    <th>Spend</th>
                    <th>Lead Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(supplier => (
                    <tr key={supplier.id}>
                      <td><strong>{supplier.name}</strong><small>{supplier.email || 'No email yet'}</small></td>
                      <td>{supplier.category || '-'}</td>
                      <td><Rating value={supplier.rating} /></td>
                      <td><Rating value={supplier.deliveryRating} /></td>
                      <td>{supplier.rfqCount}</td>
                      <td>{formatCurrency(supplier.totalSpend)}</td>
                      <td>{supplier.avgLeadTime ? `${supplier.avgLeadTime.toFixed(1)} days` : '-'}</td>
                      <td><span className="vendor-status">{supplier.status || 'Active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No supplier comparisons yet" body="Create suppliers, pricebook entries, RFQs, purchase orders, or receiving records to compare suppliers." />
          )}
        </section>

        <aside className="vendor-comparison-card">
          <h2>Recommended Supplier</h2>
          {bestByRating ? (
            <div className="vendor-recommendation">
              <span><Trophy size={22} /></span>
              <strong>{bestByRating.name}</strong>
              <p>Highest current rating with {bestByRating.rfqCount} RFQ participation record{bestByRating.rfqCount === 1 ? '' : 's'} and {formatCurrency(bestByRating.totalSpend)} purchase spend.</p>
              <Link href="/procurement/purchase-orders">Create PO <ArrowRight size={14} /></Link>
            </div>
          ) : (
            <EmptyState title="No recommendation yet" body="Supplier recommendations will appear once supplier performance data exists." compact />
          )}
        </aside>
      </div>

      <section className="vendor-comparison-card">
        <div className="vendor-comparison-card-head">
          <h2>Pricebook Supplier Pricing</h2>
          <Link href="/procurement/pricebook">Open Pricebook <ArrowRight size={14} /></Link>
        </div>
        {itemComparisons.length ? (
          <div className="price-comparison-list">
            {itemComparisons.map(item => (
              <article key={`${item.category}-${item.item}`}>
                <div>
                  <strong>{item.item}</strong>
                  <small>{item.category}</small>
                </div>
                <div className="price-offers">
                  {item.offers.map(offer => (
                    <span key={`${item.item}-${offer.supplier}-${offer.price}`}>
                      <b>{offer.supplier}</b>
                      <small>{formatCurrency(offer.price)} · {offer.leadTime || 'No lead time'} · {offer.paymentTerms || 'No terms'}</small>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No supplier pricing yet" body="Add pricebook items with supplier names to compare item pricing." />
        )}
      </section>
    </main>
  )
}

function Kpi({ icon: Icon, title, value, helper }: { icon: React.ComponentType<{ size?: number }>; title: string; value: string; helper: string }) {
  return (
    <article>
      <span><Icon size={20} /></span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
        <p>{helper}</p>
      </div>
    </article>
  )
}

function Rating({ value }: { value: number }) {
  return (
    <span className="vendor-rating" aria-label={`${value.toFixed(1)} rating`}>
      <Star size={13} fill="#f59e0b" color="#f59e0b" />
      {value ? value.toFixed(1) : '-'}
    </span>
  )
}

function EmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={compact ? 'vendor-empty compact' : 'vendor-empty'}>
      <PackageSearch size={compact ? 28 : 38} />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

function buildSupplierComparisons(suppliers: StoredRow[], orders: StoredRow[], rfqs: StoredRow[], receiving: StoredRow[]): SupplierComparison[] {
  const names = new Map<string, SupplierComparison>()
  const ensure = (name: string) => {
    const key = normalizeKey(name)
    if (!key) return null
    if (!names.has(key)) {
      names.set(key, {
        id: key,
        name,
        category: '',
        email: '',
        rating: 0,
        deliveryRating: 0,
        totalSpend: 0,
        rfqCount: 0,
        receivedCount: 0,
        avgLeadTime: 0,
        status: 'Active',
      })
    }
    return names.get(key) || null
  }

  suppliers.forEach((row, index) => {
    const name = textFrom(row.name) || textFrom(row.supplierName) || `Supplier ${index + 1}`
    const supplier = ensure(name)
    if (!supplier) return
    supplier.category = textFrom(row.category) || textFrom(row.type) || supplier.category
    supplier.email = textFrom(row.email) || supplier.email
    supplier.rating = numberFrom(row.rating) || supplier.rating
    supplier.deliveryRating = numberFrom(row.deliveryRating) || numberFrom(row.performanceRating) || supplier.deliveryRating
    supplier.status = textFrom(row.status) || supplier.status
  })

  orders.forEach(order => {
    const supplier = ensure(textFrom(order.supplierName) || textFrom(order.supplier) || '')
    if (!supplier) return
    supplier.totalSpend += moneyFrom(order.grandTotal ?? order.total ?? order.amount)
  })

  rfqs.forEach(rfq => {
    const supplierNames = readArray(rfq.supplierNames)
    supplierNames.forEach(name => {
      const supplier = ensure(name)
      if (supplier) supplier.rfqCount += 1
    })
  })

  const leadTimes = new Map<string, number[]>()
  receiving.forEach(receipt => {
    const supplier = ensure(textFrom(receipt.supplierName) || textFrom(receipt.supplier) || '')
    if (!supplier) return
    supplier.receivedCount += 1
    const leadTime = numberFrom(receipt.leadTimeDays)
    if (leadTime > 0) {
      const list = leadTimes.get(supplier.id) || []
      list.push(leadTime)
      leadTimes.set(supplier.id, list)
    }
  })

  leadTimes.forEach((values, supplierId) => {
    const supplier = names.get(supplierId)
    if (supplier) supplier.avgLeadTime = values.reduce((sum, value) => sum + value, 0) / values.length
  })

  return [...names.values()].sort((a, b) => b.totalSpend - a.totalSpend || b.rating - a.rating || a.name.localeCompare(b.name))
}

function buildItemComparisons(pricebook: StoredRow[]): PriceComparison[] {
  const grouped = new Map<string, PriceComparison>()
  pricebook.forEach(row => {
    const item = textFrom(row.name) || textFrom(row.itemName)
    const supplier = textFrom(row.vendor) || textFrom(row.supplier) || textFrom(row.supplierName)
    if (!item || !supplier) return
    const category = textFrom(row.category) || 'Uncategorized'
    const key = `${normalizeKey(category)}:${normalizeKey(item)}`
    const existing = grouped.get(key) || { item, category, offers: [] }
    existing.offers.push({
      supplier,
      price: moneyFrom(row.price ?? row.sellingPrice ?? row.unitPrice),
      cost: moneyFrom(row.cost ?? row.basePrice),
      leadTime: textFrom(row.leadTime),
      paymentTerms: textFrom(row.paymentTerms),
    })
    grouped.set(key, existing)
  })
  return [...grouped.values()]
    .map(group => ({ ...group, offers: group.offers.sort((a, b) => a.price - b.price) }))
    .filter(group => group.offers.length > 0)
    .sort((a, b) => a.item.localeCompare(b.item))
}

function loadRows(key: string, companyId: string) {
  if (typeof window === 'undefined') return []
  const scopedKey = companyId ? companyScopedKey(key, companyId) : key
  const scoped = parseRows(window.localStorage.getItem(scopedKey))
  const global = parseRows(window.localStorage.getItem(key))
  const rows = scoped.length ? [...scoped, ...global] : global
  return uniqueRows(rows).filter(row => !companyId || !textFrom(row.companyId) || textFrom(row.companyId) === companyId)
}

function parseRows(value: string | null) {
  if (!value) return [] as StoredRow[]
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed as StoredRow[] : []
  } catch {
    return []
  }
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const id = textFrom(row.id) || textFrom(row.poNumber) || textFrom(row.rfqNumber) || textFrom(row.name) || `row-${index}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function textFrom(value: unknown) {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

function numberFrom(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function moneyFrom(value: unknown) {
  return numberFrom(value)
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value.map(textFrom).filter(Boolean) : []
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value).replace('PHP', 'Php')
}

const comparisonCss = `
.vendor-comparison {
  padding: 28px;
  color: #0f172a;
}
.vendor-comparison-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}
.vendor-comparison-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 10px;
}
.vendor-comparison-title {
  display: flex;
  gap: 12px;
  align-items: center;
}
.vendor-comparison-title > span {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #dcfce7;
  color: #16a34a;
}
.vendor-comparison h1 {
  margin: 0;
  font-size: clamp(25px, 3vw, 34px);
  letter-spacing: 0;
  line-height: 1.05;
}
.vendor-comparison p {
  color: #64748b;
  line-height: 1.45;
}
.vendor-comparison-title p {
  margin: 7px 0 0;
  font-size: 14px;
}
.vendor-comparison-search {
  width: min(420px, 100%);
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 13px;
  background: #fff;
}
.vendor-comparison-search input {
  width: 100%;
  border: 0;
  outline: 0;
  font: inherit;
}
.vendor-comparison-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.vendor-comparison-kpis article,
.vendor-comparison-card,
.vendor-comparison-guide {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, .04);
}
.vendor-comparison-kpis article {
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.vendor-comparison-kpis article > span {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  background: #dcfce7;
  color: #16a34a;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.vendor-comparison-kpis small {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}
.vendor-comparison-kpis strong {
  display: block;
  margin-top: 5px;
  font-size: 21px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vendor-comparison-kpis p {
  margin: 6px 0 0;
  font-size: 12px;
}
.vendor-comparison-guide {
  margin-top: 14px;
  padding: 15px 18px;
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.vendor-comparison-guide strong {
  display: block;
  color: #166534;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.vendor-comparison-guide p {
  margin: 5px 0 0;
  color: #166534;
  font-weight: 750;
  font-size: 13px;
}
.vendor-comparison-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 14px;
  margin-top: 14px;
}
.vendor-comparison-card {
  padding: 18px;
  overflow: hidden;
}
.vendor-comparison-card h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 950;
}
.vendor-comparison-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.vendor-comparison-card a {
  color: #2563eb;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 900;
}
.vendor-table-wrap {
  overflow-x: auto;
}
.vendor-table-wrap table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}
.vendor-table-wrap th {
  text-align: left;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .04em;
  padding: 12px;
}
.vendor-table-wrap td {
  border-top: 1px solid #edf2f7;
  padding: 13px 12px;
  font-size: 13px;
  vertical-align: middle;
}
.vendor-table-wrap td strong,
.vendor-table-wrap td small {
  display: block;
}
.vendor-table-wrap td small {
  margin-top: 4px;
  color: #64748b;
}
.vendor-rating {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 900;
}
.vendor-status {
  display: inline-flex;
  border-radius: 999px;
  background: #dcfce7;
  color: #16a34a;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 950;
}
.vendor-recommendation {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}
.vendor-recommendation > span {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #fef3c7;
  color: #d97706;
  display: grid;
  place-items: center;
}
.vendor-recommendation strong {
  font-size: 20px;
  font-weight: 950;
}
.price-comparison-list {
  display: grid;
  gap: 12px;
}
.price-comparison-list article {
  border: 1px solid #edf2f7;
  border-radius: 13px;
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  gap: 14px;
}
.price-comparison-list strong,
.price-comparison-list small {
  display: block;
}
.price-comparison-list small {
  color: #64748b;
  margin-top: 4px;
}
.price-offers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.price-offers span {
  border-radius: 11px;
  background: #f8fafc;
  border: 1px solid #e8edf4;
  padding: 8px 10px;
  min-width: 180px;
}
.vendor-empty {
  min-height: 240px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #64748b;
  padding: 24px;
}
.vendor-empty.compact {
  min-height: 170px;
}
.vendor-empty svg {
  color: #94a3b8;
}
.vendor-empty strong {
  display: block;
  color: #0f172a;
  font-size: 15px;
  margin-top: 12px;
}
.vendor-empty p {
  max-width: 310px;
  margin: 7px auto 0;
  font-size: 13px;
}
@media (max-width: 1100px) {
  .vendor-comparison-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .vendor-comparison-grid,
  .price-comparison-list article {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 700px) {
  .vendor-comparison {
    padding: 16px;
  }
  .vendor-comparison-header {
    flex-direction: column;
  }
  .vendor-comparison-kpis {
    grid-template-columns: 1fr;
  }
  .vendor-comparison-card-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
`
