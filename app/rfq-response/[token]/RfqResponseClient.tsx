'use client'

import { useEffect, useMemo, useState } from 'react'

type RfqItem = { id: string; name: string; quantity: number; unit: string; details: string }
type RfqView = {
  rfqNumber: string
  title: string
  currency: string
  closingDate: string
  supplierName: string
  items: RfqItem[]
  alreadySubmitted: boolean
  submittedAt: string
  canSubmit: boolean
  closedReason: string
}

export default function RfqResponseClient({ token }: { token: string }) {
  const [view, setView] = useState<RfqView | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [leadTimeDays, setLeadTimeDays] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState<{ total: number; currency: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch(`/api/rfq-response?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
        const payload = await response.json().catch(() => null) as { ok?: boolean; view?: RfqView; error?: string } | null
        if (!response.ok || !payload?.ok || !payload.view) throw new Error(payload?.error || 'This RFQ link is invalid or has expired.')
        if (!cancelled) setView(payload.view)
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'This RFQ link is invalid or has expired.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [token])

  const total = useMemo(() => {
    if (!view) return 0
    return view.items.reduce((sum, item) => sum + (Number(prices[item.id]) || 0) * (item.quantity || 0), 0)
  }, [prices, view])

  const submit = async () => {
    if (!view) return
    setSubmitError('')
    const lines = view.items
      .map(item => ({ itemId: item.id, unitPrice: Number(prices[item.id]) || 0 }))
      .filter(line => line.unitPrice > 0)
    if (!lines.length) {
      setSubmitError('Enter at least one unit price before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/rfq-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lines, leadTimeDays: Number(leadTimeDays) || 0, notes }),
      })
      const payload = await response.json().catch(() => null) as { ok?: boolean; total?: number; currency?: string; error?: string } | null
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Could not submit your quotation.')
      setDone({ total: payload.total || total, currency: payload.currency || view.currency })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit your quotation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="rfqr-shell">
      <style>{css}</style>
      <div className="rfqr-card">
        <header className="rfqr-head">
          <span className="rfqr-mark">RFQ</span>
          <div>
            <strong>Request for Quotation</strong>
            <small>Submit your prices — no account needed</small>
          </div>
        </header>

        {loading && <div className="rfqr-state">Loading RFQ…</div>}
        {!loading && loadError && <div className="rfqr-state error"><strong>Link unavailable</strong><span>{loadError}</span></div>}

        {!loading && view && (done ? (
          <div className="rfqr-state success">
            <strong>Quotation submitted</strong>
            <span>Thank you, {view.supplierName}. Your total of {done.currency} {done.total.toLocaleString()} for {view.rfqNumber} has been sent to the buyer.</span>
          </div>
        ) : (
          <>
            <section className="rfqr-summary">
              <h1>{view.title}</h1>
              <p>{view.rfqNumber}{view.closingDate ? ` · Closing ${view.closingDate}` : ''} · For {view.supplierName}</p>
            </section>

            {view.alreadySubmitted && <div className="rfqr-note">You already submitted a quotation{view.submittedAt ? ` on ${new Date(view.submittedAt).toLocaleDateString()}` : ''}. Submitting again will update it.</div>}
            {!view.canSubmit && <div className="rfqr-note error">{view.closedReason || 'This RFQ is not accepting quotations.'}</div>}

            <div className="rfqr-items">
              <div className="rfqr-items-head"><span>Item</span><span>Qty</span><span>Unit price ({view.currency})</span><span>Line total</span></div>
              {view.items.map(item => {
                const unitPrice = Number(prices[item.id]) || 0
                return (
                  <div key={item.id} className="rfqr-item">
                    <div><strong>{item.name}</strong>{item.details ? <small>{item.details}</small> : null}</div>
                    <span>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                    <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={prices[item.id] || ''} disabled={!view.canSubmit} onChange={event => setPrices(current => ({ ...current, [item.id]: event.target.value }))} />
                    <span className="rfqr-line-total">{(unitPrice * (item.quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )
              })}
            </div>

            <div className="rfqr-extra">
              <label>Lead time (days)<input type="number" min="0" value={leadTimeDays} disabled={!view.canSubmit} onChange={event => setLeadTimeDays(event.target.value)} placeholder="e.g., 14" /></label>
              <label>Notes for the buyer<textarea rows={3} value={notes} disabled={!view.canSubmit} onChange={event => setNotes(event.target.value)} placeholder="Optional — delivery terms, validity, remarks" /></label>
            </div>

            {submitError && <div className="rfqr-note error">{submitError}</div>}

            <footer className="rfqr-foot">
              <div className="rfqr-total"><span>Quotation total</span><strong>{view.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              <button type="button" disabled={!view.canSubmit || submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit quotation'}</button>
            </footer>
          </>
        ))}
      </div>
    </main>
  )
}

const css = `
.rfqr-shell { min-height: 100vh; min-height: 100dvh; background: linear-gradient(180deg, #0f172a 0%, #0b1220 100%); display: flex; align-items: flex-start; justify-content: center; padding: 32px 16px; font-family: var(--font-body), system-ui, sans-serif; }
.rfqr-card { width: min(760px, 100%); background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.4); }
.rfqr-head { display: flex; align-items: center; gap: 12px; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
.rfqr-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; background: #ecfdf5; color: #16a34a; font-weight: 800; font-size: 13px; }
.rfqr-head strong { display: block; font-size: 16px; color: #0f172a; }
.rfqr-head small { color: #64748b; font-size: 13px; }
.rfqr-state { padding: 40px 24px; text-align: center; color: #475569; display: grid; gap: 6px; }
.rfqr-state strong { color: #0f172a; font-size: 18px; }
.rfqr-state.error strong { color: #dc2626; }
.rfqr-state.success strong { color: #16a34a; font-size: 20px; }
.rfqr-summary { padding: 20px 24px 6px; }
.rfqr-summary h1 { margin: 0; font-size: 22px; color: #0f172a; }
.rfqr-summary p { margin: 6px 0 0; color: #64748b; font-size: 13px; }
.rfqr-note { margin: 12px 24px 0; padding: 10px 12px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 13px; }
.rfqr-note.error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.rfqr-items { padding: 16px 24px 0; }
.rfqr-items-head, .rfqr-item { display: grid; grid-template-columns: minmax(0,1fr) 90px 150px 120px; gap: 12px; align-items: center; }
.rfqr-items-head { padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; font-weight: 700; }
.rfqr-item { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
.rfqr-item > div strong { display: block; color: #0f172a; font-size: 14px; }
.rfqr-item > div small { color: #64748b; font-size: 12px; }
.rfqr-item input { width: 100%; min-height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 10px; font-size: 14px; }
.rfqr-line-total { text-align: right; font-weight: 700; color: #0f172a; font-size: 14px; }
.rfqr-extra { display: grid; grid-template-columns: 200px 1fr; gap: 14px; padding: 18px 24px; }
.rfqr-extra label { display: grid; gap: 6px; font-size: 12px; font-weight: 700; color: #334155; }
.rfqr-extra input, .rfqr-extra textarea { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px 10px; font: inherit; font-size: 14px; min-height: 38px; }
.rfqr-extra textarea { resize: vertical; }
.rfqr-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px 24px; border-top: 1px solid #e5e7eb; flex-wrap: wrap; }
.rfqr-total span { display: block; color: #64748b; font-size: 12px; }
.rfqr-total strong { font-size: 22px; color: #0f172a; }
.rfqr-foot button { min-height: 46px; padding: 0 22px; border: 0; border-radius: 9px; background: #16a34a; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; }
.rfqr-foot button:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 620px) {
  .rfqr-items-head { display: none; }
  .rfqr-item { grid-template-columns: 1fr 1fr; gap: 6px 12px; }
  .rfqr-item > div { grid-column: 1 / -1; }
  .rfqr-line-total { text-align: left; }
  .rfqr-extra { grid-template-columns: 1fr; }
}
`
