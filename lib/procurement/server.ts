import 'server-only'

import { randomUUID } from 'node:crypto'
import { listBusinessRecords, upsertBusinessRecord } from '@/lib/business/serverStore'
import { openRfqResponseToken, sealRfqResponseToken } from './tokens'

const publishedCollection = 'procurement-rfq-published'
const quotationsCollection = 'procurement-quotations'
const notificationsCollection = 'procurement-notifications'

export type PublishedRfqItem = { id: string; name: string; quantity: number; unit: string; details: string }
export type PublishedRfqSupplier = { supplierId: string; name: string; email: string; submittedAt?: string }

export type PublishedRfq = {
  id: string
  companyId: string
  rfqNumber: string
  title: string
  currency: string
  closingDate: string
  status: string
  items: PublishedRfqItem[]
  suppliers: PublishedRfqSupplier[]
  publishedAt: string
}

export type QuotationLine = { itemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }
export type Quotation = {
  id: string
  companyId: string
  rfqId: string
  rfqNumber: string
  supplierId: string
  supplierName: string
  currency: string
  lines: QuotationLine[]
  total: number
  leadTimeDays: number
  notes: string
  submittedAt: string
}

export type ProcurementNotification = {
  id: string
  companyId: string
  rfqId: string
  rfqNumber: string
  supplierName: string
  message: string
  read: boolean
  createdAt: string
}

function str(input: unknown, fallback = '', max = 500) {
  if (typeof input === 'number' && Number.isFinite(input)) return String(input)
  if (typeof input !== 'string') return fallback
  return input.replace(/\p{C}/gu, '').trim().slice(0, max) || fallback
}

function num(input: unknown, fallback = 0, min = 0, max = 1_000_000_000) {
  const value = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function record(input: unknown) {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
}

/** Buyer side (authenticated): publish an RFQ so invited suppliers can respond, returning a tokenized link per supplier. */
export async function publishRfqForSuppliers(input: {
  companyId: string
  rfqId: string
  rfqNumber: string
  title: string
  currency: string
  closingDate: string
  status: string
  items: PublishedRfqItem[]
  suppliers: Array<{ supplierId: string; name: string; email: string }>
  appOrigin: string
}) {
  const existing = (await listBusinessRecords(publishedCollection, input.companyId))
    .find(item => item.id === input.rfqId)?.payload as PublishedRfq | undefined

  const suppliers: PublishedRfqSupplier[] = input.suppliers.map(supplier => {
    const previous = existing?.suppliers?.find(item => item.supplierId === supplier.supplierId)
    return { supplierId: supplier.supplierId, name: supplier.name, email: supplier.email.toLowerCase(), submittedAt: previous?.submittedAt }
  })

  const published: PublishedRfq = {
    id: input.rfqId,
    companyId: input.companyId,
    rfqNumber: input.rfqNumber,
    title: input.title,
    currency: input.currency || 'PHP',
    closingDate: input.closingDate,
    status: input.status,
    items: input.items,
    suppliers,
    publishedAt: existing?.publishedAt || new Date().toISOString(),
  }
  await upsertBusinessRecord(publishedCollection, input.companyId, { ...published, companyId: input.companyId })

  const links = await Promise.all(suppliers.map(async supplier => {
    const token = await sealRfqResponseToken({
      companyId: input.companyId,
      rfqId: input.rfqId,
      supplierId: supplier.supplierId,
      supplierName: supplier.name,
    })
    return { ...supplier, token, url: `${input.appOrigin.replace(/\/$/, '')}/rfq-response/${token}` }
  }))

  return { published, links }
}

/** Supplier side (public, token only): the read-only view a supplier sees — only this RFQ's items, nothing else. */
export async function getRfqResponseView(tokenValue: string) {
  const token = await openRfqResponseToken(tokenValue)
  if (!token) throw Object.assign(new Error('This RFQ link is invalid or has expired.'), { status: 404 })

  const published = (await listBusinessRecords(publishedCollection, token.companyId))
    .find(item => item.id === token.rfqId)?.payload as PublishedRfq | undefined
  if (!published) throw Object.assign(new Error('This RFQ is no longer available.'), { status: 404 })

  const invite = published.suppliers.find(item => item.supplierId === token.supplierId)
  const closed = ['Awarded', 'Cancelled', 'Closed'].includes(published.status)
  const pastDue = published.closingDate ? Date.now() > Date.parse(published.closingDate) + 1000 * 60 * 60 * 24 : false

  return {
    rfqNumber: published.rfqNumber,
    title: published.title,
    currency: published.currency,
    closingDate: published.closingDate,
    supplierName: token.supplierName || invite?.name || 'Supplier',
    items: published.items,
    alreadySubmitted: Boolean(invite?.submittedAt),
    submittedAt: invite?.submittedAt || '',
    canSubmit: !closed && !pastDue,
    closedReason: closed ? 'This RFQ has been closed by the buyer.' : pastDue ? 'The closing date for this RFQ has passed.' : '',
  }
}

/** Supplier side (public, token only): record a quotation, mark the invite submitted, notify the buyer. */
export async function submitQuotation(tokenValue: string, payload: unknown) {
  const token = await openRfqResponseToken(tokenValue)
  if (!token) throw Object.assign(new Error('This RFQ link is invalid or has expired.'), { status: 404 })

  const records = await listBusinessRecords(publishedCollection, token.companyId)
  const publishedRecord = records.find(item => item.id === token.rfqId)
  const published = publishedRecord?.payload as PublishedRfq | undefined
  if (!published) throw Object.assign(new Error('This RFQ is no longer available.'), { status: 404 })
  if (['Awarded', 'Cancelled', 'Closed'].includes(published.status)) {
    throw Object.assign(new Error('This RFQ has been closed and is no longer accepting quotations.'), { status: 409 })
  }
  if (published.closingDate && Date.now() > Date.parse(published.closingDate) + 1000 * 60 * 60 * 24) {
    throw Object.assign(new Error('The closing date for this RFQ has passed.'), { status: 409 })
  }

  const data = record(payload)
  const rawLines = Array.isArray(data.lines) ? data.lines : []
  const itemById = new Map(published.items.map(item => [item.id, item]))
  const lines: QuotationLine[] = rawLines.slice(0, 200).map(rawLine => {
    const line = record(rawLine)
    const itemId = str(line.itemId, '', 120)
    const item = itemById.get(itemId)
    const quantity = item ? item.quantity : num(line.quantity, 0)
    const unitPrice = num(line.unitPrice, 0)
    return { itemId, name: item?.name || str(line.name, 'Item', 200), quantity, unitPrice, lineTotal: Math.round(unitPrice * quantity * 100) / 100 }
  }).filter(line => itemById.has(line.itemId))

  if (!lines.length) throw Object.assign(new Error('Enter at least one unit price to submit a quotation.'), { status: 400 })

  const total = Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100
  const supplierName = token.supplierName || published.suppliers.find(s => s.supplierId === token.supplierId)?.name || 'Supplier'
  const submittedAt = new Date().toISOString()

  const quotation: Quotation = {
    id: `${token.rfqId}::${token.supplierId}`,
    companyId: token.companyId,
    rfqId: token.rfqId,
    rfqNumber: published.rfqNumber,
    supplierId: token.supplierId,
    supplierName,
    currency: published.currency,
    lines,
    total,
    leadTimeDays: num(data.leadTimeDays, 0, 0, 3650),
    notes: str(data.notes, '', 1000),
    submittedAt,
  }
  await upsertBusinessRecord(quotationsCollection, token.companyId, { ...quotation, companyId: token.companyId })

  // Mark this supplier's invite as submitted.
  const nextSuppliers = published.suppliers.map(item => item.supplierId === token.supplierId ? { ...item, submittedAt } : item)
  await upsertBusinessRecord(publishedCollection, token.companyId, { ...published, suppliers: nextSuppliers, companyId: token.companyId })

  // Notify the buyer.
  await upsertBusinessRecord(notificationsCollection, token.companyId, {
    id: `notif-${randomUUID()}`,
    companyId: token.companyId,
    rfqId: token.rfqId,
    rfqNumber: published.rfqNumber,
    supplierName,
    message: `${supplierName} submitted a quotation for ${published.rfqNumber} (${published.currency} ${total.toLocaleString()}).`,
    read: false,
    createdAt: submittedAt,
  })

  return { ok: true, total, currency: published.currency, supplierName }
}

/** Buyer side (authenticated): quotations received, optionally for one RFQ. */
export async function listQuotations(companyId: string, rfqId?: string) {
  const rows = await listBusinessRecords(quotationsCollection, companyId)
  const quotations = rows.map(row => row.payload as Quotation).filter(Boolean)
  return (rfqId ? quotations.filter(q => q.rfqId === rfqId) : quotations)
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
}

export async function listProcurementNotifications(companyId: string) {
  const rows = await listBusinessRecords(notificationsCollection, companyId)
  return rows.map(row => row.payload as ProcurementNotification).filter(Boolean)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50)
}
