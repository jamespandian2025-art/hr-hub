'use client'

import { FormEvent, type ComponentType, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  Filter,
  Grid3X3,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Send,
  Star,
  TrendingDown,
  X,
  XCircle,
} from 'lucide-react'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const quotationsKey = 'flowsys-procurement-quotations'
const rfqsKey = 'flowsys-procurement-rfqs'
const suppliersKey = 'flowsys-suppliers'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'

type StoredRow = Record<string, unknown>
type QuoteStatus = 'Draft' | 'Received' | 'Under Review' | 'Accepted' | 'Declined' | 'Expired'
type ViewMode = 'table' | 'cards'

type SupplierOption = {
  id: string
  name: string
  email: string
}

type RfqOption = {
  id: string
  rfqNumber: string
  title: string
  estimatedValue: number
  items: StoredRow[]
  source: StoredRow
}

type QuoteForm = {
  rfqId: string
  supplierId: string
  supplierName: string
  submittedDate: string
  validUntil: string
  currency: string
  subtotal: string
  discount: string
  tax: string
  freight: string
  leadTime: string
  paymentTerms: string
  deliveryTerms: string
  notes: string
}

type NormalizedQuote = {
  id: string
  quoteNumber: string
  rfqId: string
  rfqNumber: string
  title: string
  supplierId: string
  supplierName: string
  submittedDate: string
  validUntil: string
  status: QuoteStatus
  currency: string
  subtotal: number
  discount: number
  tax: number
  freight: number
  total: number
  leadTime: number
  paymentTerms: string
  deliveryTerms: string
  score: number
  notes: string
  activity: string[]
  source: StoredRow
}

const emptyForm: QuoteForm = {
  rfqId: '',
  supplierId: '',
  supplierName: '',
  submittedDate: todayInput(),
  validUntil: '',
  currency: 'PHP',
  subtotal: '',
  discount: '',
  tax: '',
  freight: '',
  leadTime: '',
  paymentTerms: '',
  deliveryTerms: '',
  notes: '',
}

const statusConfig: Record<QuoteStatus, { tone: string; label: string }> = {
  Draft: { tone: 'gray', label: 'Draft' },
  Received: { tone: 'blue', label: 'Received' },
  'Under Review': { tone: 'orange', label: 'Under Review' },
  Accepted: { tone: 'green', label: 'Accepted' },
  Declined: { tone: 'red', label: 'Declined' },
  Expired: { tone: 'gray', label: 'Expired' },
}

const paymentTermOptions = ['COD', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days']
const deliveryTermOptions = ['Supplier delivery', 'Pickup', 'Site delivery', 'FOB', 'CIF', 'Delivered Duty Paid']
const currencyOptions = ['PHP', 'USD', 'EUR']

export default function ProcurementQuotationsPage() {
  const [companyId, setCompanyId] = useState('')
  const [storedQuotes, setStoredQuotes] = useState<StoredRow[]>([])
  const [storedRfqs, setStoredRfqs] = useState<StoredRow[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [supplierFilter, setSupplierFilter] = useState('All')
  const [rfqFilter, setRfqFilter] = useState('All')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [openActionId, setOpenActionId] = useState('')
  const [form, setForm] = useState<QuoteForm>(emptyForm)

  useEffect(() => {
    const load = () => {
      const activeCompanyId = getActiveCompany()?.id || ''
      setCompanyId(activeCompanyId)
      setStoredQuotes(loadRows(quotationsKey, activeCompanyId))
      setStoredRfqs(loadRows(rfqsKey, activeCompanyId))
      setSuppliers(loadSuppliers(activeCompanyId))
    }

    load()
    window.addEventListener('storage', load)
    window.addEventListener('focus', load)
    window.addEventListener(companyChangeEvent, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('focus', load)
      window.removeEventListener(companyChangeEvent, load)
    }
  }, [])

  const rfqs = useMemo(() => storedRfqs.map((rfq, index) => normalizeRfqOption(rfq, index)).filter(Boolean) as RfqOption[], [storedRfqs])
  const quotes = useMemo(() => storedQuotes.map((quote, index) => normalizeQuote(quote, index, rfqs, suppliers)).filter(Boolean) as NormalizedQuote[], [rfqs, storedQuotes, suppliers])
  const quoteNumber = useMemo(() => nextQuoteNumber(quotes), [quotes])
  const supplierOptions = useMemo(() => uniqueValues([...suppliers.map(supplier => supplier.name), ...quotes.map(quote => quote.supplierName)].filter(Boolean)), [quotes, suppliers])
  const rfqOptions = useMemo(() => uniqueValues(quotes.map(quote => quote.rfqNumber).filter(Boolean)), [quotes])
  const activeFilterCount = [statusFilter, supplierFilter, rfqFilter].filter(value => value !== 'All').length

  const stats = useMemo(() => {
    const count = (status: QuoteStatus) => quotes.filter(quote => quote.status === status).length
    const reviewable = quotes.filter(quote => ['Received', 'Under Review'].includes(quote.status))
    const accepted = quotes.filter(quote => quote.status === 'Accepted')
    const bestTotal = reviewable.length ? Math.min(...reviewable.map(quote => quote.total).filter(Boolean)) : 0
    const averageTotal = reviewable.length ? reviewable.reduce((sum, quote) => sum + quote.total, 0) / reviewable.length : 0
    const expiring = quotes.filter(quote => quote.status !== 'Accepted' && quote.status !== 'Declined' && daysUntil(quote.validUntil) >= 0 && daysUntil(quote.validUntil) <= 7).length

    return {
      total: quotes.length,
      received: count('Received'),
      review: count('Under Review'),
      accepted: accepted.length,
      declined: count('Declined'),
      expired: count('Expired'),
      expiring,
      acceptedValue: accepted.reduce((sum, quote) => sum + quote.total, 0),
      bestTotal,
      potentialSavings: averageTotal && bestTotal ? Math.max(averageTotal - bestTotal, 0) : 0,
      averageScore: quotes.length ? Math.round(quotes.reduce((sum, quote) => sum + quote.score, 0) / quotes.length) : 0,
    }
  }, [quotes])

  const tabs = useMemo(() => [
    { label: 'All', count: quotes.length },
    { label: 'Received', count: stats.received },
    { label: 'Under Review', count: stats.review },
    { label: 'Accepted', count: stats.accepted },
    { label: 'Declined', count: stats.declined },
    { label: 'Expired', count: stats.expired },
  ], [quotes.length, stats])

  const filteredQuotes = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return quotes.filter(quote => {
      const matchesSearch = !needle || [
        quote.quoteNumber,
        quote.rfqNumber,
        quote.title,
        quote.supplierName,
        quote.paymentTerms,
        quote.deliveryTerms,
        quote.notes,
      ].some(value => value.toLowerCase().includes(needle))
      const matchesTab = activeTab === 'All' || quote.status === activeTab
      const matchesStatus = statusFilter === 'All' || quote.status === statusFilter
      const matchesSupplier = supplierFilter === 'All' || quote.supplierName === supplierFilter
      const matchesRfq = rfqFilter === 'All' || quote.rfqNumber === rfqFilter
      return matchesSearch && matchesTab && matchesStatus && matchesSupplier && matchesRfq
    })
  }, [activeTab, quotes, rfqFilter, search, statusFilter, supplierFilter])

  const selectedQuote = quotes.find(quote => quote.id === selectedId) || filteredQuotes[0] || quotes[0]
  const comparisonSet = selectedQuote ? quotes.filter(quote => quote.rfqId && quote.rfqId === selectedQuote.rfqId).sort((a, b) => a.total - b.total) : []
  const bestQuote = comparisonSet[0]
  const bestSupplier = quotes.slice().sort((a, b) => b.score - a.score)[0]
  const selectedSupplier = suppliers.find(supplier => supplier.id === form.supplierId)
  const selectedRfq = rfqs.find(rfq => rfq.id === form.rfqId)
  const formTotal = quoteTotal(form)

  function persist(nextQuotes: StoredRow[]) {
    const unique = uniqueRows(nextQuotes)
    setStoredQuotes(unique)
    persistRows(quotationsKey, unique, companyId)
  }

  function resetFilters() {
    setSearch('')
    setActiveTab('All')
    setStatusFilter('All')
    setSupplierFilter('All')
    setRfqFilter('All')
  }

  function resetForm() {
    setForm({ ...emptyForm, submittedDate: todayInput() })
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const supplierName = selectedSupplier?.name || form.supplierName.trim()
    if (!supplierName || formTotal <= 0) return

    const now = new Date()
    const record: StoredRow = {
      id: `quote-${now.getTime()}`,
      companyId,
      quoteNumber,
      rfqId: form.rfqId,
      rfqNumber: selectedRfq?.rfqNumber || '',
      title: selectedRfq?.title || 'Direct supplier quotation',
      supplierId: selectedSupplier?.id || '',
      supplierName,
      submittedDate: form.submittedDate || now.toISOString(),
      validUntil: form.validUntil,
      status: 'Received',
      currency: form.currency,
      subtotal: numberValue(form.subtotal),
      discount: numberValue(form.discount),
      tax: numberValue(form.tax),
      freight: numberValue(form.freight),
      total: formTotal,
      leadTime: numberValue(form.leadTime),
      paymentTerms: form.paymentTerms,
      deliveryTerms: form.deliveryTerms,
      score: scoreQuote(formTotal, numberValue(form.leadTime), form.paymentTerms),
      notes: form.notes.trim(),
      activity: [`Quotation received on ${formatDate(now.toISOString())}`],
      createdAt: now.toISOString(),
    }

    persist([record, ...storedQuotes])
    setSelectedId(String(record.id))
    resetForm()
    setShowCreate(false)
  }

  function updateStatus(quote: NormalizedQuote, status: QuoteStatus) {
    const now = new Date().toISOString()
    // An RFQ awards to a single quote (it records one awardedQuoteId). When a
    // quote is accepted, its still-open competitors for the same RFQ must be
    // declined, otherwise one single-award RFQ can end up with several
    // "Accepted" quotes. Only quotes still in active competition are declined;
    // already Declined/Expired/Accepted quotes are left untouched.
    const declineCompetitors = status === 'Accepted' && Boolean(quote.rfqId)
    const openForDecline: QuoteStatus[] = ['Draft', 'Received', 'Under Review']
    const next = storedQuotes.map(record => {
      const normalized = normalizeQuote(record, 0, rfqs, suppliers)
      if (!normalized) return record
      if (normalized.id === quote.id) {
        return {
          ...record,
          status,
          activity: [`Status changed to ${status} on ${formatDate(now)}`, ...readStringArray(record.activity)],
          updatedAt: now,
        }
      }
      if (declineCompetitors && normalized.rfqId === quote.rfqId && openForDecline.includes(normalized.status)) {
        return {
          ...record,
          status: 'Declined',
          activity: [`Declined automatically when ${quote.quoteNumber} was accepted on ${formatDate(now)}`, ...readStringArray(record.activity)],
          updatedAt: now,
        }
      }
      return record
    })
    persist(next)
    if (status === 'Accepted') syncAcceptedQuoteToRfq(quote, now)
    setOpenActionId('')
  }

  function syncAcceptedQuoteToRfq(quote: NormalizedQuote, now: string) {
    if (!quote.rfqId) return
    const nextRfqs = storedRfqs.map(record => {
      const normalized = normalizeRfqOption(record, 0)
      if (!normalized || normalized.id !== quote.rfqId) return record
      return {
        ...record,
        status: 'Awarded',
        awardedQuoteId: quote.id,
        awardedSupplierId: quote.supplierId,
        awardedSupplierName: quote.supplierName,
        awardedAmount: quote.total,
        quotations: Math.max(numberValue(record.quotations), quotes.filter(item => item.rfqId === quote.rfqId).length),
        activity: [`Awarded to ${quote.supplierName} from ${quote.quoteNumber} on ${formatDate(now)}`, ...readStringArray(record.activity)],
        updatedAt: now,
      }
    })
    setStoredRfqs(nextRfqs)
    persistRows(rfqsKey, uniqueRows(nextRfqs), companyId)
  }

  function createPurchaseOrderFromQuote(quote: NormalizedQuote) {
    if (!quote || quote.total <= 0) return
    const existingOrders = loadRows(purchaseOrdersKey, companyId)
    const existing = existingOrders.find(order => readString(order.sourceQuoteId) === quote.id)
    if (existing) return

    const now = new Date().toISOString()
    const rfq = rfqs.find(item => item.id === quote.rfqId)
    const sourceItems = rfq?.items.length ? rfq.items : [{ name: quote.title, description: quote.title, quantity: 1, unit: 'lot' }]
    const itemCount = Math.max(sourceItems.length, 1)
    const unitAmount = quote.total / itemCount
    const items = sourceItems.map((item, index) => {
      const name = readString(item.name || item.description || item.itemName) || quote.title
      const quantity = Math.max(numberValue(item.quantity), 1)
      const amount = itemCount === 1 ? quote.total : unitAmount
      const unitPrice = amount / quantity
      return {
        name,
        sku: readString(item.sku || item.code),
        unit: readString(item.unit) || 'lot',
        quantity,
        unitPrice,
        discount: 0,
        taxRate: 0,
        amount,
        lineNumber: index + 1,
      }
    })
    const order: StoredRow = {
      id: `po-${now.replace(/[^0-9]/g, '')}`,
      companyId,
      poNumber: nextPoNumber(existingOrders),
      supplierId: quote.supplierId,
      supplierName: quote.supplierName,
      supplier: quote.supplierName,
      status: 'Open',
      orderDate: todayInput(),
      deliveryDate: quote.validUntil,
      paymentTerms: quote.paymentTerms,
      currency: quote.currency,
      shippingMethod: quote.deliveryTerms,
      referenceNotes: `Created from ${quote.quoteNumber}${quote.rfqNumber ? ` / ${quote.rfqNumber}` : ''}`,
      sourceQuoteId: quote.id,
      sourceQuoteNumber: quote.quoteNumber,
      sourceRfqId: quote.rfqId,
      sourceRfqNumber: quote.rfqNumber,
      receivedPercent: 0,
      amountReceived: 0,
      items,
      subtotal: quote.subtotal || quote.total,
      discount: quote.discount,
      vat: quote.tax,
      freight: quote.freight,
      total: quote.total,
      grandTotal: quote.total,
      amount: quote.total,
      activity: [`Created from accepted quotation ${quote.quoteNumber} on ${formatDate(now)}`],
      createdAt: now,
    }
    persistRows(purchaseOrdersKey, [order, ...existingOrders], companyId)
    updateStatus(quote, 'Accepted')
  }

  return (
    <main className="quotes-page" style={{ fontFamily: font }}>
      <style>{quotesCss}</style>

      <section className="quotes-page-head">
        <div>
          <div className="quotes-breadcrumb"><span>Procurement</span><span>/</span><strong>Quotations</strong></div>
          <div className="quotes-title-row">
            <span className="quotes-title-icon"><FileCheck2 size={22} /></span>
            <div>
              <h1>Supplier Quotations <Star size={18} /></h1>
              <p>Capture supplier bids, compare landed cost, score terms, and move the best response to award.</p>
            </div>
          </div>
        </div>
        <div className="quotes-actions">
          <button type="button" className="quotes-secondary-button" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
            <Grid3X3 size={16} /> Views <ChevronDown size={14} />
          </button>
          <button type="button" className="quotes-secondary-button" onClick={() => setShowFilters(value => !value)}>
            <Filter size={16} /> Filters <span>{activeFilterCount}</span>
          </button>
          <button type="button" className="quotes-icon-button" aria-label="Reset quotation filters" onClick={resetFilters}>
            <MoreHorizontal size={18} />
          </button>
          <button type="button" className="quotes-primary-button" onClick={() => setShowCreate(true)}>
            <Plus size={17} /> New Quotation
          </button>
        </div>
      </section>

      <section className="quotes-kpis" aria-label="Quotation metrics">
        <KpiCard title="Total Quotes" value={String(stats.total)} helper="Supplier responses" icon={FileCheck2} tone="green" />
        <KpiCard title="Under Review" value={String(stats.review)} helper="Evaluation queue" icon={Clock3} tone="orange" />
        <KpiCard title="Accepted Value" value={formatCurrency(stats.acceptedValue)} helper={`${stats.accepted} accepted`} icon={CheckCircle2} tone="blue" />
        <KpiCard title="Potential Savings" value={formatCurrency(stats.potentialSavings)} helper={stats.bestTotal ? `Best review quote ${formatCurrency(stats.bestTotal)}` : 'Needs comparable quotes'} icon={TrendingDown} tone="purple" />
        <KpiCard title="Expiring Soon" value={String(stats.expiring)} helper="Valid for 7 days or less" icon={AlertTriangle} tone="red" />
      </section>

      <section className="quotes-tabs" aria-label="Quotation status tabs">
        {tabs.map(tab => (
          <button key={tab.label} type="button" className={activeTab === tab.label ? 'active' : ''} onClick={() => setActiveTab(tab.label)}>
            {tab.label} <span>{tab.count}</span>
          </button>
        ))}
      </section>

      <section className="quotes-grid-shell">
        <div className="quotes-left">
          <section className="quotes-workspace">
            <div className="quotes-toolbar">
              <label className="quotes-search">
                <Search size={17} />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search quotation, supplier, RFQ, terms..." aria-label="Search quotations" />
              </label>
              <SelectControl label="Status" value={statusFilter} onChange={setStatusFilter} options={['All', ...Object.keys(statusConfig)]} />
              <SelectControl label="Supplier" value={supplierFilter} onChange={setSupplierFilter} options={['All', ...supplierOptions]} />
              <SelectControl label="RFQ" value={rfqFilter} onChange={setRfqFilter} options={['All', ...rfqOptions]} />
            </div>

            {showFilters && (
              <div className="quotes-filter-panel">
                <SelectControl label="Status" value={statusFilter} onChange={setStatusFilter} options={['All', ...Object.keys(statusConfig)]} />
                <SelectControl label="Supplier" value={supplierFilter} onChange={setSupplierFilter} options={['All', ...supplierOptions]} />
                <SelectControl label="RFQ" value={rfqFilter} onChange={setRfqFilter} options={['All', ...rfqOptions]} />
                <button type="button" className="quotes-secondary-button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}

            {quotes.length === 0 ? (
              <EmptyQuotes onCreate={() => setShowCreate(true)} />
            ) : viewMode === 'table' ? (
              <div className="quotes-list-card">
                <div className="quotes-table-wrap">
                  <table className="quotes-table">
                    <thead>
                      <tr>
                        <th>Quote</th>
                        <th>Supplier</th>
                        <th>RFQ / Requirement</th>
                        <th>Total</th>
                        <th>Lead Time</th>
                        <th>Validity</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotes.map(quote => (
                        <tr key={quote.id} className={selectedQuote?.id === quote.id ? 'selected' : ''} onClick={() => setSelectedId(quote.id)}>
                          <td data-label="Quote"><strong>{quote.quoteNumber}</strong><small>{formatDate(quote.submittedDate)}</small></td>
                          <td data-label="Supplier"><strong>{quote.supplierName}</strong><small>{quote.paymentTerms || 'No payment terms'}</small></td>
                          <td data-label="RFQ"><strong>{quote.rfqNumber || 'Direct quote'}</strong><small>{quote.title}</small></td>
                          <td data-label="Total"><strong>{formatCurrency(quote.total)}</strong><small>Freight {formatCurrency(quote.freight)}</small></td>
                          <td data-label="Lead Time">{quote.leadTime ? `${quote.leadTime} days` : '-'}</td>
                          <td data-label="Validity">{quote.validUntil ? formatDate(quote.validUntil) : '-'}<small>{validityLabel(quote.validUntil)}</small></td>
                          <td data-label="Score"><ScorePill value={quote.score} /></td>
                          <td data-label="Status"><StatusBadge status={quote.status} /></td>
                          <td data-label="Actions">
                            <div className="quotes-row-actions">
                              <button type="button" aria-label={`Open actions for ${quote.quoteNumber}`} onClick={event => { event.stopPropagation(); setOpenActionId(openActionId === quote.id ? '' : quote.id) }}>
                                <MoreHorizontal size={17} />
                              </button>
                              {openActionId === quote.id && (
                                <div className="quotes-action-menu" onClick={event => event.stopPropagation()}>
                                  {(['Under Review', 'Accepted', 'Declined', 'Expired'] as QuoteStatus[]).map(status => (
                                    <button key={status} type="button" onClick={() => updateStatus(quote, status)}>{status}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filteredQuotes.length && <InlineEmpty onReset={resetFilters} />}
              </div>
            ) : (
              <div className="quotes-card-grid">
                {filteredQuotes.map(quote => (
                  <button key={quote.id} type="button" className={`quotes-card${selectedQuote?.id === quote.id ? ' selected' : ''}`} onClick={() => setSelectedId(quote.id)}>
                    <span><StatusBadge status={quote.status} /> <ScorePill value={quote.score} /></span>
                    <strong>{quote.supplierName}</strong>
                    <small>{quote.quoteNumber} / {quote.rfqNumber || 'Direct quote'}</small>
                    <p>{formatCurrency(quote.total)} · {quote.leadTime ? `${quote.leadTime} days` : 'No lead time'} · {quote.paymentTerms || 'No terms'}</p>
                  </button>
                ))}
                {!filteredQuotes.length && <InlineEmpty onReset={resetFilters} />}
              </div>
            )}
          </section>
        </div>

        <aside className="quotes-right">
          <section className="quotes-side-card">
            <div className="quotes-card-title">
              <div>
                <h2>Selected Quote</h2>
                <p>{selectedQuote ? selectedQuote.quoteNumber : 'No quote selected'}</p>
              </div>
              {selectedQuote && <StatusBadge status={selectedQuote.status} />}
            </div>
            {selectedQuote ? (
              <>
                <div className="quotes-selected-total">
                  <span>{selectedQuote.supplierName}</span>
                  <strong>{formatCurrency(selectedQuote.total)}</strong>
                  <small>{selectedQuote.title}</small>
                </div>
                <DetailRow label="RFQ" value={selectedQuote.rfqNumber || 'Direct quotation'} />
                <DetailRow label="Submitted" value={formatDate(selectedQuote.submittedDate)} />
                <DetailRow label="Valid Until" value={selectedQuote.validUntil ? formatDate(selectedQuote.validUntil) : '-'} />
                <DetailRow label="Lead Time" value={selectedQuote.leadTime ? `${selectedQuote.leadTime} days` : '-'} />
                <DetailRow label="Payment Terms" value={selectedQuote.paymentTerms || '-'} />
                <DetailRow label="Delivery Terms" value={selectedQuote.deliveryTerms || '-'} />
                <div className="quotes-side-actions">
                  <button type="button" className="quotes-primary-button" onClick={() => updateStatus(selectedQuote, 'Accepted')}><CheckCircle2 size={16} /> Accept</button>
                  <button type="button" className="quotes-secondary-button" onClick={() => createPurchaseOrderFromQuote(selectedQuote)}><Send size={16} /> Create PO</button>
                  <button type="button" className="quotes-secondary-button" onClick={() => updateStatus(selectedQuote, 'Under Review')}><Clock3 size={16} /> Review</button>
                </div>
              </>
            ) : (
              <p className="quotes-muted">Create or select a quotation to review commercial details.</p>
            )}
          </section>

          <section className="quotes-side-card">
            <div className="quotes-card-title">
              <div>
                <h2>Bid Comparison</h2>
                <p>{comparisonSet.length ? `${comparisonSet.length} response${comparisonSet.length === 1 ? '' : 's'} for this RFQ` : 'No comparable RFQ yet'}</p>
              </div>
            </div>
            {comparisonSet.length ? (
              <div className="quotes-compare-list">
                {comparisonSet.slice(0, 5).map((quote, index) => (
                  <button key={quote.id} type="button" className={selectedQuote?.id === quote.id ? 'active' : ''} onClick={() => setSelectedId(quote.id)}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{quote.supplierName}</strong>
                      <small>{formatCurrency(quote.total)} · score {quote.score}</small>
                    </div>
                    {bestQuote?.id === quote.id && <b>Best</b>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="quotes-muted">Link quotations to the same RFQ to compare supplier responses side by side.</p>
            )}
          </section>

          <section className="quotes-side-card">
            <div className="quotes-card-title">
              <div>
                <h2>Commercial Health</h2>
                <p>Current quote quality signals</p>
              </div>
            </div>
            <MetricBlock label="Average Score" value={stats.averageScore ? `${stats.averageScore}/100` : '-'} progress={stats.averageScore} />
            <MetricBlock label="Best Supplier" value={bestSupplier?.supplierName || '-'} helper={bestSupplier ? `Score ${bestSupplier.score}` : 'No supplier score yet'} />
            <MetricBlock label="Accepted Spend" value={formatCurrency(stats.acceptedValue)} />
          </section>
        </aside>
      </section>

      {showCreate && (
        <div className="quotes-drawer-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <form className="quotes-create-drawer" aria-labelledby="create-quote-title" onSubmit={handleCreate} onMouseDown={event => event.stopPropagation()}>
            <div className="quotes-drawer-head">
              <div>
                <h2 id="create-quote-title">New Supplier Quotation</h2>
                <p>Record the supplier response exactly enough for comparison, approval, and purchase order conversion.</p>
              </div>
              <button type="button" aria-label="Close quotation form" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>

            <div className="quotes-form-layout">
              <section className="quotes-form-card">
                <h3>Quote Identity</h3>
                <div className="quotes-form-grid">
                  <label>
                    RFQ
                    <select value={form.rfqId} onChange={event => setForm(previous => ({ ...previous, rfqId: event.target.value }))}>
                      <option value="">Direct quotation</option>
                      {rfqs.map(rfq => <option key={rfq.id} value={rfq.id}>{rfq.rfqNumber} - {rfq.title}</option>)}
                    </select>
                  </label>
                  <label>
                    Supplier
                    <select value={form.supplierId} onChange={event => setForm(previous => ({ ...previous, supplierId: event.target.value, supplierName: '' }))}>
                      <option value="">Manual supplier</option>
                      {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Supplier Name
                    <input value={selectedSupplier?.name || form.supplierName} disabled={Boolean(selectedSupplier)} onChange={event => setForm(previous => ({ ...previous, supplierName: event.target.value }))} placeholder="Supplier name" />
                  </label>
                  <label>
                    Submitted Date
                    <input type="date" value={toInputDate(form.submittedDate)} onChange={event => setForm(previous => ({ ...previous, submittedDate: event.target.value }))} />
                  </label>
                  <label>
                    Valid Until
                    <input type="date" value={toInputDate(form.validUntil)} onChange={event => setForm(previous => ({ ...previous, validUntil: event.target.value }))} />
                  </label>
                  <label>
                    Currency
                    <select value={form.currency} onChange={event => setForm(previous => ({ ...previous, currency: event.target.value }))}>
                      {currencyOptions.map(currency => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  </label>
                </div>
              </section>

              <section className="quotes-form-card">
                <h3>Commercials</h3>
                <div className="quotes-form-grid">
                  <label>
                    Subtotal
                    <input type="number" min="0" step="0.01" value={form.subtotal} onChange={event => setForm(previous => ({ ...previous, subtotal: event.target.value }))} placeholder="0.00" />
                  </label>
                  <label>
                    Discount
                    <input type="number" min="0" step="0.01" value={form.discount} onChange={event => setForm(previous => ({ ...previous, discount: event.target.value }))} placeholder="0.00" />
                  </label>
                  <label>
                    Tax / VAT
                    <input type="number" min="0" step="0.01" value={form.tax} onChange={event => setForm(previous => ({ ...previous, tax: event.target.value }))} placeholder="0.00" />
                  </label>
                  <label>
                    Freight
                    <input type="number" min="0" step="0.01" value={form.freight} onChange={event => setForm(previous => ({ ...previous, freight: event.target.value }))} placeholder="0.00" />
                  </label>
                  <label>
                    Lead Time (days)
                    <input type="number" min="0" step="1" value={form.leadTime} onChange={event => setForm(previous => ({ ...previous, leadTime: event.target.value }))} placeholder="0" />
                  </label>
                  <label>
                    Payment Terms
                    <select value={form.paymentTerms} onChange={event => setForm(previous => ({ ...previous, paymentTerms: event.target.value }))}>
                      <option value="">Select terms</option>
                      {paymentTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
                    </select>
                  </label>
                  <label>
                    Delivery Terms
                    <select value={form.deliveryTerms} onChange={event => setForm(previous => ({ ...previous, deliveryTerms: event.target.value }))}>
                      <option value="">Select delivery</option>
                      {deliveryTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
                    </select>
                  </label>
                  <label className="wide-full">
                    Notes
                    <textarea value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} placeholder="Clarifications, exclusions, warranty notes, or negotiation points." />
                  </label>
                </div>
              </section>

              <aside className="quotes-form-card">
                <h3>Quote Summary</h3>
                <DetailRow label="Next Number" value={quoteNumber} />
                <DetailRow label="Supplier" value={selectedSupplier?.name || form.supplierName || '-'} />
                <DetailRow label="RFQ" value={selectedRfq?.rfqNumber || 'Direct quotation'} />
                <DetailRow label="Score" value={`${scoreQuote(formTotal, numberValue(form.leadTime), form.paymentTerms)}/100`} />
                <div className="quotes-total-line">
                  <span>Landed Total</span>
                  <strong>{formatCurrency(formTotal)}</strong>
                </div>
              </aside>
            </div>

            <footer className="quotes-create-footer">
              <span>Quotations start as received and can move into review, accepted, declined, or expired.</span>
              <div>
                <button type="button" className="quotes-secondary-button" onClick={() => { resetForm(); setShowCreate(false) }}>Cancel</button>
                <button type="submit" className="quotes-primary-button"><Send size={16} /> Save Quotation</button>
              </div>
            </footer>
          </form>
        </div>
      )}
    </main>
  )
}

function KpiCard({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: ComponentType<{ size?: number }>; tone: string }) {
  return (
    <article className="quotes-kpi">
      <span className={`quotes-kpi-icon ${tone}`}><Icon size={20} /></span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  )
}

function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="quotes-select">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  const config = statusConfig[status] || statusConfig.Draft
  return <span className={`quotes-badge ${config.tone}`}>{config.label}</span>
}

function ScorePill({ value }: { value: number }) {
  const tone = value >= 80 ? 'green' : value >= 60 ? 'blue' : value >= 40 ? 'orange' : 'gray'
  return <span className={`quotes-score ${tone}`}>{value || 0}</span>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="quotes-detail-row"><span>{label}</span><strong>{value}</strong></div>
}

function MetricBlock({ label, value, helper, progress }: { label: string; value: string; helper?: string; progress?: number }) {
  return (
    <div className="quotes-metric-block">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
      {typeof progress === 'number' && <i><b style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></i>}
    </div>
  )
}

function EmptyQuotes({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="quotes-empty">
      <span><PackageCheck size={44} /></span>
      <h2>No supplier quotations yet</h2>
      <p>Record supplier responses against RFQs, compare landed totals and lead times, then accept the quote that gives procurement the best outcome.</p>
      <button type="button" className="quotes-primary-button" onClick={onCreate}><Plus size={16} /> New Quotation</button>
    </div>
  )
}

function InlineEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="quotes-inline-empty">
      <XCircle size={28} />
      <strong>No quotations match these filters</strong>
      <span>Clear the current filters to return to the full quotation register.</span>
      <button type="button" onClick={onReset}>Reset filters</button>
    </div>
  )
}

function loadRows(key: string, companyId: string) {
  if (typeof window === 'undefined') return []
  const scoped = companyId ? readStoredRows(window.localStorage.getItem(companyScopedKey(key, companyId))) : []
  const global = readStoredRows(window.localStorage.getItem(key))
  const globalForCompany = scoped.length ? global.filter(row => readString(row.companyId) === companyId) : global
  const rows = scoped.length ? [...scoped, ...globalForCompany] : globalForCompany
  return uniqueRows(rows).filter(row => !companyId || !readString(row.companyId) || readString(row.companyId) === companyId)
}

function persistRows(key: string, rows: StoredRow[], companyId: string) {
  if (typeof window === 'undefined') return
  const serialized = JSON.stringify(uniqueRows(rows))
  window.localStorage.setItem(key, serialized)
  window.localStorage.setItem(companyScopedKey(key, companyId), serialized)
  window.dispatchEvent(new Event('storage'))
}

function loadSuppliers(companyId: string): SupplierOption[] {
  return loadRows(suppliersKey, companyId).map((supplier, index) => ({
    id: readString(supplier.id) || `supplier-${index}`,
    name: readString(supplier.name || supplier.companyName || supplier.vendorName) || `Supplier ${index + 1}`,
    email: readString(supplier.email || supplier.contactEmail),
  })).filter(supplier => supplier.name)
}

function normalizeRfqOption(row: StoredRow, index: number): RfqOption | null {
  const title = readString(row.title || row.name || row.description)
  const rfqNumber = readString(row.rfqNumber || row.number || row.reference) || `RFQ-${String(index + 1).padStart(4, '0')}`
  if (!title && !rfqNumber) return null
  return {
    id: readString(row.id) || `rfq-${index}`,
    rfqNumber,
    title: title || 'Untitled RFQ',
    estimatedValue: numberValue(row.estimatedValue || row.amount || row.total),
    items: readStoredArray(row.items),
    source: row,
  }
}

function normalizeQuote(row: StoredRow, index: number, rfqs: RfqOption[], suppliers: SupplierOption[]): NormalizedQuote | null {
  const rfqId = readString(row.rfqId)
  const rfq = rfqs.find(item => item.id === rfqId)
  const supplierId = readString(row.supplierId)
  const supplier = suppliers.find(item => item.id === supplierId)
  const supplierName = readString(row.supplierName || row.vendorName || row.supplier || supplier?.name)
  const subtotal = numberValue(row.subtotal || row.amount || row.quotedAmount)
  const discount = numberValue(row.discount)
  const tax = numberValue(row.tax || row.vat)
  const freight = numberValue(row.freight || row.shipping)
  const total = numberValue(row.total) || Math.max(subtotal - discount + tax + freight, 0)
  const quoteNumber = readString(row.quoteNumber || row.quotationNumber || row.number) || `QT-${String(index + 1).padStart(5, '0')}`
  if (!supplierName && !total) return null

  const status = normalizeStatus(readString(row.status))
  const leadTime = numberValue(row.leadTime || row.leadTimeDays)
  const paymentTerms = readString(row.paymentTerms)
  return {
    id: readString(row.id) || `quote-${index}`,
    quoteNumber,
    rfqId,
    rfqNumber: readString(row.rfqNumber || rfq?.rfqNumber),
    title: readString(row.title || row.rfqTitle || rfq?.title) || 'Direct supplier quotation',
    supplierId,
    supplierName: supplierName || 'Unnamed supplier',
    submittedDate: readString(row.submittedDate || row.date || row.createdAt) || new Date().toISOString(),
    validUntil: readString(row.validUntil || row.expiresAt),
    status,
    currency: readString(row.currency) || 'PHP',
    subtotal,
    discount,
    tax,
    freight,
    total,
    leadTime,
    paymentTerms,
    deliveryTerms: readString(row.deliveryTerms),
    score: numberValue(row.score) || scoreQuote(total, leadTime, paymentTerms),
    notes: readString(row.notes || row.description),
    activity: readStringArray(row.activity),
    source: row,
  }
}

function quoteTotal(form: QuoteForm) {
  return Math.max(numberValue(form.subtotal) - numberValue(form.discount) + numberValue(form.tax) + numberValue(form.freight), 0)
}

function scoreQuote(total: number, leadTime: number, paymentTerms: string) {
  if (!total) return 0
  const priceScore = total <= 0 ? 0 : Math.max(20, 58 - Math.min(total / 25000, 28))
  const deliveryScore = leadTime ? Math.max(8, 26 - Math.min(leadTime, 18)) : 12
  const termsScore = paymentTerms.includes('30') || paymentTerms.includes('45') || paymentTerms.includes('60') ? 16 : paymentTerms ? 10 : 6
  return Math.max(0, Math.min(100, Math.round(priceScore + deliveryScore + termsScore)))
}

function normalizeStatus(value: string): QuoteStatus {
  const match = (Object.keys(statusConfig) as QuoteStatus[]).find(status => status.toLowerCase() === value.toLowerCase())
  return match || 'Received'
}

function nextQuoteNumber(quotes: NormalizedQuote[]) {
  const max = quotes.reduce((highest, quote) => {
    const match = quote.quoteNumber.match(/(\d+)$/)
    return Math.max(highest, match ? Number(match[1]) : 0)
  }, 0)
  return `QT-${String(max + 1).padStart(5, '0')}`
}

function nextPoNumber(rows: StoredRow[]) {
  const year = new Date().getFullYear()
  const next = rows.reduce((highest, row) => {
    const match = readString(row.poNumber || row.number).match(/(\d+)$/)
    return Math.max(highest, match ? Number(match[1]) : 0)
  }, 0) + 1
  return `PO-${year}-${String(next).padStart(4, '0')}`
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const id = readString(row.id) || `row-${index}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function readStoredRows(raw: string | null) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as StoredRow[]
    if (Array.isArray(parsed?.items)) return parsed.items as StoredRow[]
    if (Array.isArray(parsed?.records)) return parsed.records as StoredRow[]
    if (Array.isArray(parsed?.suppliers)) return parsed.suppliers as StoredRow[]
  } catch {
    return []
  }
  return []
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function readStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(readString).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value]
  return []
}

function readStoredArray(value: unknown): StoredRow[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as StoredRow[] : []
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const number = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(number) ? number : 0
  }
  return 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0)
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function toInputDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10)
}

function daysUntil(value: string) {
  if (!value) return Number.POSITIVE_INFINITY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
}

function validityLabel(value: string) {
  const days = daysUntil(value)
  if (!Number.isFinite(days)) return 'No expiry'
  if (days < 0) return 'Expired'
  if (days === 0) return 'Expires today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

const quotesCss = `
.quotes-page {
  padding: 26px 28px 34px;
  color: #0f172a;
}
.quotes-page-head,
.quotes-actions,
.quotes-toolbar,
.quotes-filter-panel,
.quotes-card-title,
.quotes-side-actions {
  display: flex;
  align-items: center;
}
.quotes-page-head {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}
.quotes-breadcrumb {
  display: flex;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 13px;
}
.quotes-title-row {
  display: flex;
  align-items: center;
  gap: 15px;
}
.quotes-title-icon {
  width: 56px;
  height: 56px;
  border-radius: 15px;
  background: #ecfdf5;
  color: #16a34a;
  display: grid;
  place-items: center;
}
.quotes-title-row h1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: 0;
}
.quotes-title-row h1 svg {
  color: #94a3b8;
}
.quotes-title-row p,
.quotes-card-title p,
.quotes-muted {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
.quotes-actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.quotes-primary-button,
.quotes-secondary-button,
.quotes-icon-button,
.quotes-row-actions > button,
.quotes-action-menu button,
.quotes-inline-empty button,
.quotes-drawer-head button {
  min-height: 42px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.quotes-primary-button,
.quotes-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
}
.quotes-primary-button {
  border-color: #16a34a;
  background: #16a34a;
  color: #fff;
}
.quotes-secondary-button span {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: #0f172a;
  color: #fff;
  font-size: 12px;
}
.quotes-icon-button,
.quotes-row-actions > button,
.quotes-drawer-head button {
  width: 42px;
  display: grid;
  place-items: center;
}
.quotes-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(145px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.quotes-kpi,
.quotes-workspace,
.quotes-side-card,
.quotes-create-drawer {
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}
.quotes-kpi {
  min-height: 112px;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.quotes-kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: grid;
  place-items: center;
}
.quotes-kpi-icon.green { background: #dcfce7; color: #16a34a; }
.quotes-kpi-icon.orange { background: #ffedd5; color: #f97316; }
.quotes-kpi-icon.blue { background: #dbeafe; color: #2563eb; }
.quotes-kpi-icon.purple { background: #f3e8ff; color: #7c3aed; }
.quotes-kpi-icon.red { background: #fee2e2; color: #ef4444; }
.quotes-kpi span:not(.quotes-kpi-icon) {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}
.quotes-kpi strong {
  display: block;
  margin-top: 6px;
  font-size: 21px;
  line-height: 1;
}
.quotes-kpi small {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}
.quotes-tabs {
  display: flex;
  gap: 30px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
}
.quotes-tabs button {
  min-height: 48px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}
.quotes-tabs button.active {
  color: #111827;
  border-color: #16a34a;
}
.quotes-tabs span {
  color: #64748b;
  margin-left: 6px;
  font-size: 12px;
}
.quotes-grid-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  gap: 16px;
}
.quotes-left {
  min-width: 0;
}
.quotes-right {
  display: grid;
  gap: 16px;
  align-content: start;
}
.quotes-workspace {
  border-radius: 0 0 16px 16px;
  overflow: visible;
}
.quotes-toolbar {
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.quotes-search {
  min-width: 240px;
  flex: 1 1 340px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #64748b;
  background: #fff;
}
.quotes-search input,
.quotes-select select,
.quotes-form-card input,
.quotes-form-card select,
.quotes-form-card textarea {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  color: #0f172a;
}
.quotes-select {
  min-width: 145px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  background: #fff;
  font-size: 13px;
  font-weight: 800;
}
.quotes-select span {
  white-space: nowrap;
}
.quotes-filter-panel {
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}
.quotes-list-card {
  min-width: 0;
  padding: 16px;
}
.quotes-table-wrap {
  min-width: 0;
  overflow: auto;
  border: 1px solid #edf2f7;
  border-radius: 12px;
}
.quotes-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
}
.quotes-table th,
.quotes-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  vertical-align: middle;
}
.quotes-table th {
  background: #f8fafc;
  color: #475569;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0;
}
.quotes-table tr.selected,
.quotes-table tr:hover {
  background: #f0fdf4;
}
.quotes-table td small {
  display: block;
  color: #64748b;
  margin-top: 4px;
  max-width: 210px;
}
.quotes-badge,
.quotes-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
}
.quotes-badge.green,
.quotes-score.green { background: #dcfce7; color: #15803d; }
.quotes-badge.blue,
.quotes-score.blue { background: #dbeafe; color: #2563eb; }
.quotes-badge.orange,
.quotes-score.orange { background: #ffedd5; color: #f97316; }
.quotes-badge.red { background: #fee2e2; color: #ef4444; }
.quotes-badge.gray,
.quotes-score.gray { background: #f1f5f9; color: #475569; }
.quotes-row-actions {
  position: relative;
}
.quotes-action-menu {
  position: absolute;
  top: 46px;
  right: 0;
  z-index: 25;
  width: 180px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
}
.quotes-action-menu button {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 9px;
  text-align: left;
  padding: 0 10px;
}
.quotes-action-menu button:hover {
  background: #f1f5f9;
}
.quotes-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
  padding: 16px;
}
.quotes-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 15px;
  cursor: pointer;
  background: #fff;
  text-align: left;
  font: inherit;
}
.quotes-card.selected {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px #dcfce7;
}
.quotes-card span {
  display: flex;
  gap: 8px;
}
.quotes-card strong {
  display: block;
  margin-top: 12px;
  font-size: 15px;
}
.quotes-card small,
.quotes-card p {
  color: #64748b;
  font-size: 12px;
}
.quotes-empty,
.quotes-inline-empty {
  min-height: 420px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 44px 18px;
}
.quotes-empty > span {
  width: 118px;
  height: 118px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  background: #eff6ff;
  color: #64748b;
}
.quotes-empty h2 {
  margin: 0;
  font-size: 19px;
}
.quotes-empty p {
  max-width: 390px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}
.quotes-inline-empty {
  min-height: 220px;
  gap: 7px;
}
.quotes-inline-empty span {
  color: #64748b;
  font-size: 13px;
}
.quotes-inline-empty button {
  padding: 0 16px;
}
.quotes-side-card {
  border-radius: 16px;
  padding: 16px;
}
.quotes-card-title {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.quotes-card-title h2,
.quotes-form-card h3 {
  margin: 0;
  font-size: 15px;
}
.quotes-selected-total {
  display: grid;
  gap: 5px;
  padding: 14px;
  border-radius: 13px;
  background: #f8fafc;
  margin-bottom: 12px;
}
.quotes-selected-total span,
.quotes-selected-total small {
  color: #64748b;
  font-size: 12px;
}
.quotes-selected-total strong {
  font-size: 24px;
}
.quotes-detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}
.quotes-detail-row span {
  color: #64748b;
}
.quotes-side-actions {
  gap: 10px;
  margin-top: 15px;
}
.quotes-side-actions > * {
  flex: 1;
}
.quotes-compare-list {
  display: grid;
  gap: 8px;
}
.quotes-compare-list button {
  min-height: 54px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 0;
  border-radius: 11px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  padding: 8px;
  font: inherit;
}
.quotes-compare-list button.active,
.quotes-compare-list button:hover {
  background: #f0fdf4;
}
.quotes-compare-list span {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: #dcfce7;
  color: #16a34a;
  font-size: 12px;
  font-weight: 900;
}
.quotes-compare-list small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
}
.quotes-compare-list b {
  color: #16a34a;
  font-size: 11px;
}
.quotes-metric-block {
  display: grid;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
}
.quotes-metric-block span,
.quotes-metric-block small {
  color: #64748b;
  font-size: 12px;
}
.quotes-metric-block strong {
  font-size: 18px;
}
.quotes-metric-block i {
  height: 6px;
  display: block;
  border-radius: 999px;
  overflow: hidden;
  background: #e5e7eb;
}
.quotes-metric-block b {
  display: block;
  height: 100%;
  background: #16a34a;
}
.quotes-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, .42);
  display: flex;
  justify-content: flex-end;
}
.quotes-create-drawer {
  width: min(1060px, calc(100vw - 32px));
  height: 100%;
  border-radius: 0;
  overflow: auto;
}
.quotes-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}
.quotes-drawer-head h2 {
  margin: 0;
  font-size: 22px;
}
.quotes-drawer-head p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
}
.quotes-form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(260px, 300px);
  gap: 16px;
  padding: 16px 16px 86px;
  align-items: start;
}
.quotes-form-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  padding: 16px;
}
.quotes-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.quotes-form-grid label {
  min-width: 0;
  display: grid;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.quotes-form-grid label.wide-full {
  grid-column: 1 / -1;
}
.quotes-form-grid input,
.quotes-form-grid select,
.quotes-form-grid textarea {
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 11px;
  padding: 0 12px;
  width: 100%;
  outline: 0;
  background: #fff;
}
.quotes-form-grid textarea {
  min-height: 92px;
  padding: 12px;
  resize: vertical;
}
.quotes-total-line {
  margin: 14px -16px -16px;
  padding: 16px;
  background: #ecfdf5;
  border-radius: 0 0 14px 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.quotes-total-line span {
  color: #166534;
  font-weight: 900;
}
.quotes-total-line strong {
  font-size: 18px;
}
.quotes-create-footer {
  position: sticky;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, .96);
  backdrop-filter: blur(10px);
}
.quotes-create-footer span {
  color: #64748b;
  font-size: 12px;
}
.quotes-create-footer > div {
  display: flex;
  gap: 12px;
}
@media (max-width: 1280px) {
  .quotes-grid-shell,
  .quotes-form-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .quotes-right {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .quotes-kpis {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}
@media (max-width: 900px) {
  .quotes-page {
    padding: 18px 14px 28px;
  }
  .quotes-page-head {
    display: grid;
  }
  .quotes-actions {
    justify-content: stretch;
  }
  .quotes-actions > *,
  .quotes-toolbar > *,
  .quotes-filter-panel > * {
    flex: 1 1 100%;
  }
  .quotes-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 4px;
  }
  .quotes-kpi {
    min-width: 210px;
    scroll-snap-align: start;
  }
  .quotes-toolbar {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .quotes-right {
    grid-template-columns: 1fr;
  }
  .quotes-table-wrap {
    border: 0;
    overflow: visible;
  }
  .quotes-table,
  .quotes-table thead,
  .quotes-table tbody,
  .quotes-table tr,
  .quotes-table td {
    display: block;
    min-width: 0;
  }
  .quotes-table thead {
    display: none;
  }
  .quotes-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    background: #fff;
  }
  .quotes-table td {
    border: 0;
    padding: 7px 0;
  }
  .quotes-table td::before {
    content: attr(data-label);
    display: inline-block;
    min-width: 118px;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
  }
  .quotes-row-actions {
    display: flex;
    justify-content: flex-end;
  }
}
@media (max-width: 520px) {
  .quotes-title-row {
    align-items: flex-start;
  }
  .quotes-kpis,
  .quotes-form-grid {
    grid-template-columns: 1fr;
  }
  .quotes-kpi {
    min-width: 0;
  }
  .quotes-list-card,
  .quotes-card-grid {
    padding: 12px;
  }
  .quotes-create-drawer {
    width: 100vw;
    border-radius: 18px 18px 0 0;
    height: calc(100% - 20px);
    margin-top: 20px;
  }
  .quotes-drawer-head,
  .quotes-form-layout {
    padding: 18px;
  }
  .quotes-create-footer,
  .quotes-create-footer > div {
    display: grid;
    width: 100%;
  }
}
`
