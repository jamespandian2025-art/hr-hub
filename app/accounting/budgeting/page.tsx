'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Filter,
  MoreHorizontal,
  PieChart,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  type AccountingBudget,
  emptyAccountingData,
  formatDate,
  loadAccountingData,
  money,
  saveAccountingBudgets,
  subscribeAccountingData,
} from '@/lib/accounting/data'

const font = 'var(--font-body)'
const tabs = ['All', 'Draft', 'Pending', 'Approved', 'Over Budget']

type BudgetForm = {
  name: string
  project: string
  department: string
  category: string
  date: string
  total: string
  actual: string
  status: string
  description: string
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeStatus(value: string) {
  const status = value.trim() || 'Draft'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function statusTone(value: string) {
  const status = value.toLowerCase()
  if (status === 'approved') return { bg: '#dcfce7', color: '#15803d' }
  if (status === 'pending') return { bg: '#fef3c7', color: '#b45309' }
  if (status === 'over budget' || status === 'rejected') return { bg: '#fee2e2', color: '#dc2626' }
  return { bg: '#f1f5f9', color: '#475569' }
}

function derivedStatus(budget: AccountingBudget) {
  if (budget.total > 0 && budget.actual > budget.total) return 'Over Budget'
  return budget.status
}

function StatusPill({ value }: { value: string }) {
  const tone = statusTone(value)
  return <span className="budget-status-pill" style={{ background: tone.bg, color: tone.color }}>{value}</span>
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] || { Empty: 'No rows' })
  const csv = [
    headers.join(','),
    ...(rows.length ? rows : [{ Empty: 'No budget rows' }]).map(row => headers.map(header => `"${String(row[header] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n')
  const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(value, 140))
  const color = value > 100 ? '#ef4444' : value >= 85 ? '#f59e0b' : '#16a34a'
  return (
    <span className="budget-progress">
      <span style={{ width: `${Math.min(clamped, 100)}%`, background: color }} />
    </span>
  )
}

export default function AccountingBudgetingPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createRequested = searchParams.get('new') === '1'
  const [data, setData] = useState(emptyAccountingData)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState<BudgetForm>({
    name: '',
    project: '',
    department: '',
    category: '',
    date: todayInputValue(),
    total: '',
    actual: '',
    status: 'Draft',
    description: '',
  })

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  const budgets = data.budgets
  const createPanelOpen = showCreate || createRequested
  const filtered = useMemo(() => budgets.filter(budget => {
    const status = derivedStatus(budget)
    const tabMatches = activeTab === 'All' || status.toLowerCase() === activeTab.toLowerCase()
    const term = search.trim().toLowerCase()
    const searchMatches = !term || [budget.name, budget.project, budget.department, budget.category, budget.status].some(value => value.toLowerCase().includes(term))
    return tabMatches && searchMatches
  }), [activeTab, budgets, search])

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.total, 0)
  const actualSpend = budgets.reduce((sum, budget) => sum + budget.actual, 0)
  const remaining = totalBudget - actualSpend
  const utilization = totalBudget ? Math.round((actualSpend / totalBudget) * 100) : 0
  const overBudget = budgets.filter(budget => budget.actual > budget.total && budget.total > 0)
  const approved = budgets.filter(budget => budget.status.toLowerCase() === 'approved')
  const pending = budgets.filter(budget => budget.status.toLowerCase() === 'pending')
  const statusSummary = tabs.slice(1).map(label => ({
    label,
    count: budgets.filter(budget => derivedStatus(budget).toLowerCase() === label.toLowerCase()).length,
  }))
  const metrics: Array<{ title: string; value: string; detail: string; icon: LucideIcon; tone: string; up?: boolean }> = [
    { title: 'Total Budget', value: money(totalBudget, data.currency), detail: `${budgets.length} budget${budgets.length === 1 ? '' : 's'}`, icon: Target, tone: '#2563eb', up: totalBudget > 0 },
    { title: 'Actual Spend', value: money(actualSpend, data.currency), detail: `${utilization}% utilized`, icon: TrendingUp, tone: '#f97316' },
    { title: 'Remaining', value: money(remaining, data.currency), detail: remaining >= 0 ? 'Available budget' : 'Over allocated', icon: PieChart, tone: remaining >= 0 ? '#16a34a' : '#ef4444', up: remaining >= 0 },
    { title: 'Approved', value: String(approved.length), detail: money(approved.reduce((sum, budget) => sum + budget.total, 0), data.currency), icon: CheckCircle2, tone: '#16a34a', up: approved.length > 0 },
    { title: 'Needs Review', value: String(pending.length + overBudget.length), detail: `${pending.length} pending, ${overBudget.length} over`, icon: AlertTriangle, tone: '#ef4444' },
  ]
  const categorySummary = Object.entries(budgets.reduce<Record<string, number>>((groups, budget) => {
    const key = budget.category || 'Uncategorized'
    groups[key] = (groups[key] || 0) + budget.total
    return groups
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const closeCreate = () => {
    setShowCreate(false)
    if (createRequested) router.replace(pathname)
  }

  const updateBudgets = (nextBudgets: AccountingBudget[]) => {
    saveAccountingBudgets(nextBudgets)
    setData(loadAccountingData())
  }

  const createBudget = (event: FormEvent) => {
    event.preventDefault()
    const total = Number(form.total)
    const actual = Number(form.actual)
    const budget: AccountingBudget = {
      id: `budget-${Date.now()}`,
      name: form.name.trim() || 'Untitled budget',
      project: form.project.trim() || 'No project',
      date: form.date || todayInputValue(),
      status: normalizeStatus(form.status),
      description: form.description.trim(),
      total: Number.isFinite(total) ? total : 0,
      actual: Number.isFinite(actual) ? actual : 0,
      department: form.department.trim() || 'Unassigned',
      category: form.category.trim() || 'General',
    }
    updateBudgets([...budgets, budget])
    setForm({ name: '', project: '', department: '', category: '', date: todayInputValue(), total: '', actual: '', status: 'Draft', description: '' })
    closeCreate()
  }

  const setBudgetStatus = (id: string, status: string) => {
    updateBudgets(budgets.map(budget => budget.id === id ? { ...budget, status } : budget))
  }

  const deleteBudget = (id: string) => {
    updateBudgets(budgets.filter(budget => budget.id !== id))
    setSelected(prev => prev.filter(item => item !== id))
  }
  const exportBudgets = () => {
    const rows = filtered.map(budget => ({
      Name: budget.name,
      Project: budget.project,
      Department: budget.department,
      Category: budget.category,
      Date: formatDate(budget.date),
      Budget: money(budget.total, data.currency),
      Actual: money(budget.actual, data.currency),
      Remaining: money(budget.total - budget.actual, data.currency),
      Status: derivedStatus(budget),
    }))
    downloadCsv(`accounting-budgets-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const approveSelected = () => {
    if (!selected.length) return
    updateBudgets(budgets.map(budget => selected.includes(budget.id) ? { ...budget, status: 'Approved' } : budget))
    setSelected([])
  }

  const toggleSelected = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])

  return (
    <div
      className="budget-page"
      style={{
        fontFamily: font,
        minHeight: 'calc(100dvh - 76px)',
        background: '#101010',
        color: '#fafafa',
      }}
    >
      <style>{budgetCss}</style>
      <div className="budget-header">
        <div>
          <h1 className="budget-title">Budgeting</h1>
          <p className="budget-subtitle">Plan project budgets, monitor spend, and keep variance visible across accounting.</p>
        </div>
        <div className="budget-header-actions">
          <label className="budget-search">
            <Search size={16} color="#64748b" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search budgets, projects..." />
          </label>
          <button type="button" className="budget-toolbar-button" onClick={exportBudgets}><Download size={15} /> Export CSV</button>
          <button type="button" className={filtersOpen ? 'budget-toolbar-button is-active' : 'budget-toolbar-button'} onClick={() => setFiltersOpen(open => !open)}><Filter size={15} /> Filters</button>
          <button type="button" className="budget-primary-button" onClick={() => setShowCreate(true)}><Plus size={15} /> New Budget <ChevronDown size={13} /></button>
        </div>
      </div>

      <section className="budget-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="budget-card budget-metric-card">
              <span className="budget-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={23} /></span>
              <span>
                <span className="budget-card-label">{metric.title}</span>
                <strong className="budget-card-value">{metric.value}</strong>
                <small className="budget-card-detail" style={{ color: metric.up ? '#16a34a' : '#334155' }}>{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <nav className="budget-tabs" aria-label="Budget sections">
        {tabs.map(tab => (
          <button key={tab} type="button" className={activeTab === tab ? 'is-active' : undefined} onClick={() => setActiveTab(tab)}>
            {tab} <span>{tab === 'All' ? budgets.length : statusSummary.find(item => item.label === tab)?.count || 0}</span>
          </button>
        ))}
      </nav>

      {filtersOpen && (
        <section className="budget-filter-panel">
          <label>Status
            <select value={activeTab} onChange={event => setActiveTab(event.target.value)}>
              {tabs.map(tab => <option key={tab}>{tab}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => { setSearch(''); setActiveTab('All') }}>Reset Filters</button>
        </section>
      )}

      {createPanelOpen && (
        <section className="budget-card budget-create-panel">
          <div className="budget-panel-header">
            <h2>Create Budget</h2>
            <button type="button" className="budget-link-button" onClick={closeCreate}>Cancel</button>
          </div>
          <form className="budget-form" onSubmit={createBudget}>
            <label>
              <span>Budget Name</span>
              <input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Project mobilization budget" required />
            </label>
            <label>
              <span>Project</span>
              <input value={form.project} onChange={event => setForm(prev => ({ ...prev, project: event.target.value }))} placeholder="Project or cost center" />
            </label>
            <label>
              <span>Department</span>
              <input value={form.department} onChange={event => setForm(prev => ({ ...prev, department: event.target.value }))} placeholder="Finance, Site Ops..." />
            </label>
            <label>
              <span>Category</span>
              <input value={form.category} onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))} placeholder="Materials, Labor..." />
            </label>
            <label>
              <span>Budget Date</span>
              <input value={form.date} onChange={event => setForm(prev => ({ ...prev, date: event.target.value }))} type="date" required />
            </label>
            <label>
              <span>Status</span>
              <select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}>
                <option>Draft</option>
                <option>Pending</option>
                <option>Approved</option>
              </select>
            </label>
            <label>
              <span>Total Budget</span>
              <input value={form.total} onChange={event => setForm(prev => ({ ...prev, total: event.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" required />
            </label>
            <label>
              <span>Actual Spend</span>
              <input value={form.actual} onChange={event => setForm(prev => ({ ...prev, actual: event.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" />
            </label>
            <label className="budget-form-wide">
              <span>Description</span>
              <textarea value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} rows={3} placeholder="Scope, assumptions, or approval notes" />
            </label>
            <div className="budget-form-actions">
              <strong>Budget records sync to accounting reports and variance views.</strong>
              <button type="submit" className="budget-primary-button"><Plus size={15} /> Create Budget</button>
            </div>
          </form>
        </section>
      )}

      <section className="budget-grid">
        <div className="budget-card budget-table-panel">
          <div className="budget-panel-header">
            <h2>Budget Register</h2>
            <div className="budget-panel-actions">
              {selected.length > 0 && <button type="button" onClick={approveSelected}>Approve {selected.length}</button>}
              <strong>Showing {filtered.length} of {budgets.length}</strong>
            </div>
          </div>
          <div className="budget-table-wrap">
            <table className="budget-table">
              <thead>
                <tr>{['', 'Budget', 'Project', 'Department', 'Category', 'Date', 'Budget', 'Actual', 'Variance', 'Use', 'Status', 'Actions'].map(column => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(budget => {
                  const variance = budget.total - budget.actual
                  const use = budget.total ? Math.round((budget.actual / budget.total) * 100) : 0
                  const status = derivedStatus(budget)
                  return (
                    <tr key={budget.id}>
                      <td data-label="Select"><input type="checkbox" checked={selected.includes(budget.id)} onChange={() => toggleSelected(budget.id)} aria-label={`Select ${budget.name}`} /></td>
                      <td data-label="Budget"><strong>{budget.name}</strong><small>{budget.description || 'No notes'}</small></td>
                      <td data-label="Project">{budget.project}</td>
                      <td data-label="Department">{budget.department}</td>
                      <td data-label="Category">{budget.category}</td>
                      <td data-label="Date">{formatDate(budget.date)}</td>
                      <td data-label="Budget">{money(budget.total, data.currency)}</td>
                      <td data-label="Actual">{money(budget.actual, data.currency)}</td>
                      <td data-label="Variance" className={variance < 0 ? 'budget-negative' : 'budget-positive'}>{money(variance, data.currency)}</td>
                      <td data-label="Use"><ProgressBar value={use} /><small>{use}%</small></td>
                      <td data-label="Status"><StatusPill value={status} /></td>
                      <td data-label="Actions">
                        <div className="budget-row-actions">
                          <button type="button" aria-label={`Approve ${budget.name}`} onClick={() => setBudgetStatus(budget.id, 'Approved')}><CheckCircle2 size={15} /></button>
                          <button type="button" aria-label={`Mark ${budget.name} pending`} onClick={() => setBudgetStatus(budget.id, 'Pending')}><Clock3 size={15} /></button>
                          <button type="button" aria-label={`Delete ${budget.name}`} onClick={() => deleteBudget(budget.id)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} className="budget-empty">No budgets match this view. Create a budget and it will appear in accounting reports and variance tracking.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="budget-side-stack">
          <div className="budget-card">
            <div className="budget-panel-header">
              <h2>Status Summary</h2>
              <MoreHorizontal size={16} color="#64748b" />
            </div>
            <div className="budget-status-list">
              {statusSummary.map(item => (
                <div key={item.label}>
                  <span><StatusPill value={item.label} /></span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="budget-card">
            <div className="budget-panel-header">
              <h2>Category Allocation</h2>
              <BarChart3 size={16} color="#64748b" />
            </div>
            <div className="budget-category-list">
              {categorySummary.map(([category, amount]) => (
                <div key={category}>
                  <span>{category}</span>
                  <strong>{money(amount, data.currency)}</strong>
                  <ProgressBar value={totalBudget ? (amount / totalBudget) * 100 : 0} />
                </div>
              ))}
              {categorySummary.length === 0 && <p>No budget categories yet.</p>}
            </div>
          </div>

          <div className="budget-card">
            <h2 className="budget-card-heading">Quick Actions</h2>
            <div className="budget-actions">
              <button type="button" onClick={() => setShowCreate(true)}><span><Plus size={15} /></span>New Budget<ChevronDown size={15} /></button>
              <button type="button" onClick={() => setActiveTab('Over Budget')}><span><AlertTriangle size={15} /></span>Review Variance<ChevronDown size={15} /></button>
              <button type="button" onClick={approveSelected}><span><CheckCircle2 size={15} /></span>Approve Selected<ChevronDown size={15} /></button>
              <button type="button" onClick={() => setActiveTab('Pending')}><span><Clock3 size={15} /></span>Pending Review<ChevronDown size={15} /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const budgetCss = `
.budget-page { min-height: calc(100dvh - 76px); padding: 26px 28px 40px; background: #101010; color: #fafafa; }
.budget-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 24px; }
.budget-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.budget-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.budget-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.budget-search { width: min(340px, 40vw); min-height: 40px; border-radius: 8px; background: #fff; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e8edf4; }
.budget-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: #0f172a; }
.budget-toolbar-button, .budget-primary-button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.budget-toolbar-button.is-active { border-color: #bbf7d0; background: #ecfdf3; color: #047857; }
.budget-primary-button { border-color: #16a34a; background: #16a34a; color: #fff; font-weight: 950; }
.budget-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.budget-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.budget-metric-card { min-height: 100px; display: flex; align-items: center; }
.budget-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.budget-card-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.budget-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.budget-card-detail { display: block; color: #334155; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.budget-tabs { display: flex; align-items: center; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.budget-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
.budget-tabs button.is-active { color: #16a34a; border-bottom-color: #16a34a; }
.budget-tabs span { min-width: 22px; min-height: 22px; border-radius: 999px; background: #f1f5f9; color: #475569; display: grid; place-items: center; font-size: 11px; }
.budget-tabs button.is-active span { background: #dcfce7; color: #15803d; }
.budget-filter-panel { margin: 16px 0 0; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; padding: 14px; display: grid; grid-template-columns: minmax(180px, 240px) auto; gap: 12px; align-items: end; }
.budget-filter-panel label { display: grid; gap: 7px; color: #475569; font-size: 12px; font-weight: 900; }
.budget-filter-panel select, .budget-filter-panel button { min-height: 38px; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; color: #0f172a; padding: 0 12px; font-size: 12.5px; font-weight: 850; }
.budget-filter-panel button { cursor: pointer; justify-self: start; }
.budget-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; margin-top: 18px; }
.budget-side-stack { display: grid; align-content: start; gap: 16px; }
.budget-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.budget-panel-header h2, .budget-card-heading { margin: 0; color: #0f172a; font-size: 16px; font-weight: 950; }
.budget-panel-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.budget-panel-actions strong { color: #475569; font-size: 12px; }
.budget-panel-actions button, .budget-link-button { min-height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; padding: 0 10px; font-size: 12px; font-weight: 900; cursor: pointer; }
.budget-table-wrap { overflow-x: auto; }
.budget-table { width: 100%; min-width: 1120px; border-collapse: collapse; }
.budget-table th { text-align: left; padding: 12px 14px; color: #64748b; font-size: 11px; font-weight: 900; }
.budget-table td { padding: 13px 14px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 13px; vertical-align: middle; }
.budget-table td strong { display: block; color: #0f172a; }
.budget-table td small { display: block; color: #64748b; margin-top: 3px; }
.budget-positive { color: #16a34a !important; font-weight: 900; }
.budget-negative { color: #ef4444 !important; font-weight: 900; }
.budget-status-pill { display: inline-flex; min-height: 24px; align-items: center; border-radius: 7px; padding: 0 9px; font-size: 11.5px; font-weight: 900; white-space: nowrap; }
.budget-progress { display: block; width: 86px; height: 7px; border-radius: 999px; background: #eef2f7; overflow: hidden; }
.budget-progress span { display: block; height: 100%; border-radius: 999px; }
.budget-row-actions { display: flex; align-items: center; gap: 6px; }
.budget-row-actions button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.budget-empty { text-align: center; color: #64748b !important; padding: 34px !important; font-weight: 800; }
.budget-create-panel { margin-top: 18px; }
.budget-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.budget-form label { display: grid; gap: 7px; }
.budget-form span { color: #475569; font-size: 12px; font-weight: 900; }
.budget-form input, .budget-form select, .budget-form textarea { min-height: 40px; border: 1px solid #e8edf4; border-radius: 8px; padding: 0 12px; color: #0f172a; background: #fff; outline: 0; font-size: 13px; font-family: inherit; }
.budget-form textarea { padding: 10px 12px; resize: vertical; }
.budget-form-wide { grid-column: span 2; }
.budget-form-actions { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid #eef2f7; padding-top: 14px; }
.budget-form-actions strong { color: #475569; font-size: 12px; }
.budget-status-list, .budget-category-list { display: grid; gap: 14px; }
.budget-status-list div { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.budget-status-list strong { color: #0f172a; font-size: 18px; }
.budget-category-list div { display: grid; gap: 7px; }
.budget-category-list div > span, .budget-category-list p { color: #475569; font-size: 12.5px; font-weight: 850; margin: 0; }
.budget-category-list strong { color: #0f172a; font-size: 13px; }
.budget-actions { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 18px; }
.budget-actions button { border: 0; background: #fff; color: #0f172a; display: grid; grid-template-columns: 28px minmax(0, 1fr) 16px; align-items: center; gap: 10px; min-height: 38px; font-size: 12.5px; font-weight: 900; cursor: pointer; text-align: left; }
.budget-actions button span { width: 28px; height: 28px; border-radius: 7px; background: #eff6ff; color: #2563eb; display: grid; place-items: center; }
.accounting-theme-dark .budget-page,
html[data-theme='dark'] .budget-page { background: #101010 !important; background-color: #101010 !important; color: #fafafa !important; }
.accounting-theme-dark .budget-page :is(.budget-card,.budget-table-wrap,.budget-filter-panel),
html[data-theme='dark'] .budget-page :is(.budget-card,.budget-table-wrap,.budget-filter-panel) { background: #101010 !important; background-color: #101010 !important; border-color: #333 !important; color: #fafafa !important; box-shadow: none !important; }
.accounting-theme-dark .budget-page .budget-table th,
html[data-theme='dark'] .budget-page .budget-table th { background: #181818 !important; color: #c7c7cf !important; border-color: #333 !important; }
.accounting-theme-dark .budget-page .budget-table td,
html[data-theme='dark'] .budget-page .budget-table td { background: #101010 !important; color: #fafafa !important; border-color: #333 !important; }
@media (max-width: 1280px) {
  .budget-page { padding: 22px; }
  .budget-header { flex-direction: column; }
  .budget-header-actions, .budget-search { width: 100%; }
  .budget-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .budget-grid { grid-template-columns: 1fr; }
  .budget-side-stack { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 920px) {
  .budget-metrics, .budget-side-stack, .budget-form { grid-template-columns: 1fr 1fr; }
  .budget-form-wide { grid-column: span 2; }
  .budget-panel-header { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 640px) {
  .budget-page { padding: 16px; }
  .budget-title { font-size: 24px; }
  .budget-header-actions, .budget-metrics, .budget-side-stack, .budget-form { display: grid; grid-template-columns: 1fr; }
  .budget-filter-panel { grid-template-columns: 1fr; }
  .budget-card-value { font-size: 21px; }
  .budget-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .budget-form-wide { grid-column: auto; }
  .budget-form-actions { align-items: stretch; flex-direction: column; }
  .budget-table-wrap { overflow: visible; }
  .budget-table, .budget-table thead, .budget-table tbody, .budget-table tr, .budget-table td { display: block; width: 100%; min-width: 0; }
  .budget-table thead { display: none; }
  .budget-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .budget-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; font-size: 12.5px; align-items: center; }
  .budget-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .budget-row-actions { justify-content: flex-start; }
}
`
