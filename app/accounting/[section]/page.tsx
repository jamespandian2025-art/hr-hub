'use client'

import { use, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, BookOpenCheck, Download, Filter, Plus, Search } from 'lucide-react'
import { accountingNavItems } from '@/components/accounting/AccountingShell'
import { emptyAccountingData, formatDate, loadAccountingData, money, subscribeAccountingData } from '@/lib/accounting/data'

const font = 'var(--font-body)'

const supportedSections = new Set(['accounting', 'bills', 'expenses'])

export default function AccountingSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params)
  const [data, setData] = useState(emptyAccountingData)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  if (!supportedSections.has(section)) notFound()

  const navMeta = accountingNavItems.find(item => item.href.endsWith(`/${section}`))
  if (!navMeta) notFound()

  const rows = useMemo(() => {
    if (section === 'bills') {
      return data.bills.map(bill => ({
        id: bill.id,
        date: formatDate(bill.date),
        title: bill.name,
        party: bill.vendor,
        category: bill.category,
        debit: bill.balanceDue,
        credit: 0,
        status: bill.status,
      }))
    }

    if (section === 'expenses') {
      return data.transactions.filter(row => row.type === 'Expense').map(row => ({
        id: row.id,
        date: formatDate(row.date),
        title: row.description,
        party: row.secondary,
        category: row.category,
        debit: row.amount,
        credit: 0,
        status: row.status,
      }))
    }

    return data.transactions.map(row => ({
      id: row.id,
      date: formatDate(row.date),
      title: row.description,
      party: row.secondary,
      category: row.category,
      debit: row.type === 'Expense' ? row.amount : 0,
      credit: row.type === 'Income' ? row.amount : 0,
      status: row.status,
    }))
  }, [data, section])

  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0)
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0)
  const Icon = navMeta.icon || BookOpenCheck
  const createHref = section === 'bills' || section === 'expenses' ? '/accounting/bills?new=1' : '/accounting/transactions'
  const filteredRows = rows.filter(row => {
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${row.date} ${row.title} ${row.party} ${row.category} ${row.status}`.toLowerCase().includes(term)
  })
  const exportRows = () => {
    const headers = ['Date', 'Record', 'Party', 'Category', 'Debit', 'Credit', 'Status']
    const csv = [
      headers,
      ...filteredRows.map(row => [
        row.date,
        row.title,
        row.party || '',
        row.category || '',
        String(row.debit || ''),
        String(row.credit || ''),
        row.status,
      ]),
    ].map(values => values.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${section}-register.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="live-accounting-page" style={{ fontFamily: font }}>
      <style>{css}</style>
      <header className="live-header">
        <div className="live-title">
          <span><Icon size={21} /></span>
          <div>
            <div className="crumb"><Link href="/accounting">Accounting</Link><span>/</span><strong>{navMeta.label}</strong></div>
            <h1>{navMeta.label}</h1>
            <p>{navMeta.description}</p>
          </div>
        </div>
        <div className="live-actions">
          <button type="button" onClick={exportRows}><Download size={15} /> Export</button>
          <button type="button" onClick={() => setQuery('')}><Filter size={15} /> Clear Search</button>
          <Link href={createHref} className="primary"><Plus size={15} /> New Record</Link>
        </div>
      </header>

      <section className="live-metrics">
        <Metric title="Records" value={String(rows.length)} detail={data.companyName} icon={<BookOpenCheck size={18} />} />
        <Metric title={section === 'accounting' ? 'Debits' : 'Open / Expense'} value={money(totalDebit, data.currency)} detail="From live records" icon={<ArrowDownLeft size={18} />} />
        <Metric title={section === 'accounting' ? 'Credits' : 'Income Offset'} value={money(totalCredit, data.currency)} detail="From live records" icon={<ArrowUpRight size={18} />} />
      </section>

      <section className="live-card">
        <div className="live-card-head">
          <div>
            <h2>{navMeta.label} Register</h2>
            <p>Connected invoices, bills, expenses, payroll, and ledger entries.</p>
          </div>
          <label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${navMeta.label.toLowerCase()}...`} /></label>
        </div>
        <div className="live-table-wrap">
          <table>
            <thead>
              <tr>{['Date', 'Record', 'Party', 'Category', 'Debit', 'Credit', 'Status'].map(column => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.id}>
                  <td data-label="Date">{row.date}</td>
                  <td data-label="Record"><strong>{row.title}</strong></td>
                  <td data-label="Party">{row.party || '-'}</td>
                  <td data-label="Category">{row.category || '-'}</td>
                  <td data-label="Debit">{row.debit ? money(row.debit, data.currency) : '-'}</td>
                  <td data-label="Credit">{row.credit ? money(row.credit, data.currency) : '-'}</td>
                  <td data-label="Status"><span>{row.status}</span></td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={7} className="empty">{rows.length ? 'No records match your search.' : 'No records yet. Create invoices, bills, expenses, payroll, or ledger transactions and they will appear here.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <article className="live-card live-metric">
      <span>{icon}</span>
      <div><small>{title}</small><strong>{value}</strong><em>{detail}</em></div>
    </article>
  )
}

const css = `
.live-accounting-page{min-height:100vh;background:#f8fafc;color:#0f172a;padding:28px}
.live-header{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px}
.live-title{display:flex;gap:14px;align-items:flex-start}.live-title>span{width:42px;height:42px;border-radius:10px;background:#ecfdf3;color:#16a34a;display:grid;place-items:center}
.crumb{display:flex;gap:8px;color:#64748b;font-size:12px;font-weight:850}.crumb a{color:#64748b;text-decoration:none}.crumb strong{color:#0f172a}
h1{margin:6px 0 0;font-size:28px;line-height:1.12}p{margin:7px 0 0;color:#64748b;font-size:13px}.live-actions{display:flex;gap:10px;align-items:center}
button,.live-actions a{border:1px solid #e8edf4;background:#fff;color:#0f172a;border-radius:8px;min-height:38px;padding:0 12px;font-size:12.5px;font-weight:850;display:inline-flex;align-items:center;gap:8px;text-decoration:none}.primary{background:#16a34a!important;border-color:#16a34a!important;color:#fff!important}
.live-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:16px}.live-card{background:#fff;border:1px solid #e8edf4;border-radius:8px;padding:18px;box-shadow:0 1px 2px rgba(15,23,42,.03)}
.live-metric{display:flex;gap:12px;align-items:center}.live-metric>span{width:38px;height:38px;border-radius:9px;background:#ecfdf3;color:#16a34a;display:grid;place-items:center}.live-metric small{display:block;color:#64748b;font-size:12px;font-weight:850}.live-metric strong{display:block;margin-top:5px;font-size:22px}.live-metric em{display:block;margin-top:5px;color:#16a34a;font-size:12px;font-style:normal;font-weight:850}
.live-card-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}.live-card-head h2{margin:0;font-size:16px}.live-card-head label{width:320px;height:38px;border:1px solid #e8edf4;border-radius:8px;background:#f8fafc;display:flex;align-items:center;gap:10px;padding:0 12px}.live-card-head input{border:0;outline:0;background:transparent;flex:1;font-size:12.5px}
.live-table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:820px}th{text-align:left;padding:12px 14px;color:#64748b;font-size:11px;text-transform:uppercase}td{border-top:1px solid #eef2f7;padding:14px;color:#334155;font-size:13px}td strong{color:#0f172a}td span{display:inline-flex;border-radius:999px;background:#f1f5f9;color:#475569;padding:5px 9px;font-size:11px;font-weight:900}.empty{text-align:center;color:#64748b;font-weight:800;padding:28px}
@media(max-width:760px){.live-accounting-page{padding:18px}.live-header,.live-card-head{display:grid}.live-actions,.live-metrics{grid-template-columns:1fr}.live-actions{display:grid}.live-card-head label{width:auto}.live-metrics{display:grid}}
`
