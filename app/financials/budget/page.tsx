'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import ClientChart from '../../../components/ClientChart'
import jsPDF from 'jspdf'
import { listBusinessRecords, replaceBusinessCollection } from '@/lib/business/client'

const font = "var(--font-body)"

interface BudgetItem {
  id: number
  name: string
  remarks: string
  amount: number
}

interface Budget {
  id: number
  name: string
  project: string
  date: string
  status: string
  description: string
  total: number
}

interface ProjectRecord {
  id: number
  name: string
  client: string
  location: string
  status: string
}

const statusStyle: Record<string, { bg: string, color: string }> = {
  'PENDING':  { bg: '#fef3c7', color: '#d97706' },
  'APPROVED': { bg: '#d1fae5', color: '#059669' },
  'REJECTED': { bg: '#fee2e2', color: '#dc2626' },
}

const tabs = ['All', 'Pending', 'Approved', 'Rejected']

export default function BudgetPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createRequested = searchParams.get('new') === '1'
  const [showCreate, setShowCreate] = useState(false)
  const closeCreate = () => {
    setShowCreate(false)
    if (createRequested) router.replace(pathname)
  }
  const [showImportModal, setShowImportModal] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [openMenu, setOpenMenu] = useState<number | null>(null)

  const [project, setProject] = useState('')
  const [name, setName] = useState('')
  const [date, setDate] = useState('2026-05-06')
  const [status, setStatus] = useState('Pending')
  const [description, setDescription] = useState('')
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([{ id: 1, name: '', remarks: '', amount: 0 }])

  useEffect(() => {
    // Only mark as loaded on a SUCCESSFUL fetch. If the GET fails we must not
    // flip `loaded`, otherwise the persist effect below would immediately
    // replace the server collection with the empty initial state and wipe it.
    Promise.all([
      listBusinessRecords<Budget>('accounting-budgets'),
      listBusinessRecords<ProjectRecord>('project-legacy-records'),
    ]).then(([nextBudgets, nextProjects]) => {
      setBudgets(nextBudgets)
      setProjects(nextProjects)
      setLoaded(true)
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!loaded) return
    void replaceBusinessCollection('accounting-budgets', budgets).catch(() => undefined)
  }, [budgets, loaded])


  const addBudgetItem = () => setBudgetItems(prev => [...prev, { id: Math.max(0, ...prev.map(i => i.id)) + 1, name: '', remarks: '', amount: 0 }])
  const removeBudgetItem = (id: number) => setBudgetItems(prev => prev.filter(i => i.id !== id))
  const updateBudgetItem = (id: number, field: Exclude<keyof BudgetItem, 'id'>, value: string | number) => setBudgetItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  const total = budgetItems.reduce((sum, item) => sum + item.amount, 0)

  const toggleSelect = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const handleCreate = () => {
    const newBudget: Budget = {
      // Collision-proof id derived from the max existing id, not array length —
      // length+1 reuses an id after any delete.
      id: Math.max(0, ...budgets.map(b => b.id)) + 1,
      name: name || 'Untitled Budget',
      project: project || 'No project',
      date,
      status: status.toUpperCase(),
      description,
      total,
    }
    setBudgets(prev => [...prev, newBudget])
    closeCreate()
    setProject('')
    setName('')
    setDate('2026-05-06')
    setStatus('Pending')
    setDescription('')
    setBudgetItems([{ id: 1, name: '', remarks: '', amount: 0 }])
  }

  const handleDelete = (id: number) => {
    setBudgets(prev => prev.filter(b => b.id !== id))
    setOpenMenu(null)
  }

  const handleDownload = (budget: Budget) => {
    const doc = new jsPDF()
    doc.setFillColor(108, 99, 255)
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Budget Report', 14, 20)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Budget Details', 14, 45)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Name:`, 14, 58)
    doc.setFont('helvetica', 'bold')
    doc.text(budget.name, 50, 58)
    doc.setFont('helvetica', 'normal')
    doc.text(`Project:`, 14, 68)
    doc.setFont('helvetica', 'bold')
    doc.text(budget.project, 50, 68)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date:`, 14, 78)
    doc.setFont('helvetica', 'bold')
    doc.text(budget.date, 50, 78)
    doc.setFont('helvetica', 'normal')
    doc.text(`Status:`, 14, 88)
    doc.setFont('helvetica', 'bold')
    doc.text(budget.status, 50, 88)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Amount:`, 14, 98)
    doc.setFont('helvetica', 'bold')
    doc.text(`PHP ${budget.total.toLocaleString('en-PH')}.00`, 50, 98)
    if (budget.description) {
      doc.setFont('helvetica', 'normal')
      doc.text(`Description:`, 14, 108)
      doc.setFont('helvetica', 'bold')
      const lines = doc.splitTextToSize(budget.description, 140)
      doc.text(lines, 50, 108)
    }
    doc.setFillColor(245, 244, 255)
    doc.rect(0, 270, 210, 30, 'F')
    doc.setTextColor(108, 99, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Generated by FlowSys', 14, 283)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 283)
    doc.save(`${budget.name}.pdf`)
    setOpenMenu(null)
  }

  const filtered = budgets.filter(b => {
    const matchTab = activeTab === 'All' || b.status === activeTab.toUpperCase()
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.project.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const tabCounts = (tab: string) => tab === 'All' ? budgets.length : budgets.filter(b => b.status === tab.toUpperCase()).length

  const totalAmount = budgets.reduce((s, b) => s + b.total, 0)
  const approvedAmount = budgets.filter(b => b.status === 'APPROVED').reduce((s, b) => s + b.total, 0)

  const donutData = [
    { name: 'Pending', value: budgets.filter(b => b.status === 'PENDING').reduce((s, b) => s + b.total, 0) || 0.1, color: '#f59e0b' },
    { name: 'Approved', value: budgets.filter(b => b.status === 'APPROVED').reduce((s, b) => s + b.total, 0) || 0, color: '#10b981' },
    { name: 'Rejected', value: budgets.filter(b => b.status === 'REJECTED').reduce((s, b) => s + b.total, 0) || 0, color: '#ef4444' },
  ]

  if (showCreate || createRequested) {
    return (
      <div style={{ fontFamily: font }}>
        <div onClick={closeCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#374151', fontWeight: 600, marginBottom: '20px', cursor: 'pointer' }}>
          ? Back
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Create Budget</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Financials</span><span>•</span>
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Budget</span><span>•</span>
          <span>Create</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Project</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Select associated project</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <select value={project} onChange={e => setProject(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none', background: '#fff' }}>
              <option value="">{projects.length ? 'Select Project' : 'No projects created yet'}</option>
              {projects.map(projectRecord => (
                <option key={projectRecord.id} value={projectRecord.name}>
                  {projectRecord.name}{projectRecord.client && projectRecord.client !== '-' ? ` - ${projectRecord.client}` : ''}
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', fontWeight: 600 }}>
                Create a project first from the Projects page, then it will appear here.
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Budget Details</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Name, status, description and attachments...</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input placeholder="Name" value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>Date</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>Status</div>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none', background: '#fff' }}>
                  <option>Pending</option><option>Approved</option><option>Rejected</option>
                </select>
              </div>
            </div>
            <textarea placeholder="Write a short description" value={description} onChange={e => setDescription(e.target.value)} rows={4}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none', resize: 'vertical' }} />
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Budget Composition</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Name and amount...</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            {budgetItems.map(item => (
              <div key={item.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: '12px', marginBottom: '6px' }}>
                  <input placeholder="Name" value={item.name} onChange={e => updateBudgetItem(item.id, 'name', e.target.value)}
                    style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none' }} />
                  <input placeholder="Remarks" value={item.remarks} onChange={e => updateBudgetItem(item.id, 'remarks', e.target.value)}
                    style={{ padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>Amount</div>
                    <input type="number" placeholder="0" value={item.amount} onChange={e => updateBudgetItem(item.id, 'amount', Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none' }} />
                  </div>
                </div>
                {budgetItems.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span onClick={() => removeBudgetItem(item.id)} style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}>?? Remove</span>
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={addBudgetItem} style={{ padding: '9px 18px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                + Add Item
              </button>
              <button onClick={() => setShowImportModal(true)} style={{ padding: '9px 18px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                ? Import item
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Attachments</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Images, files and file format...</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Attachments</div>
            <div style={{ border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#fafafa', cursor: 'pointer' }}>
              <div style={{ fontSize: '40px' }}>??</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Drop or Select file</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                Drop files here or click <span style={{ color: '#6c63ff', fontWeight: 600 }}>browse</span> thorough your machine
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
          <button onClick={handleCreate} style={{ padding: '12px 28px', background: '#111827', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: font, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Create Item
          </button>
        </div>

        {showImportModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '500px', position: 'relative' }}>
              <div onClick={() => setShowImportModal(false)} style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>?</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Import Budget</div>
              <div style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#fafafa', cursor: 'pointer', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px' }}>??</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>Select PDF or CSV file</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Drop files here or click <span style={{ color: '#6c63ff', fontWeight: 600 }}>browse</span> thorough your machine</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6c63ff', fontWeight: 600, cursor: 'pointer' }}>Download Budget template</span>
                <button onClick={() => setShowImportModal(false)} style={{ padding: '10px 24px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setOpenMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>Budget</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowCreate(true)} style={{ padding: '10px 20px', background: '#fff', color: '#111827', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontFamily: font, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            + Budget
          </button>
          <button onClick={() => setShowImportModal(true)} style={{ padding: '10px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: font, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            ? Import
          </button>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>Financials</span><span>•</span><span>Budget</span><span>•</span><span>List</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600, background: '#fff', border: '1px solid #e5e7eb', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}>?? May 06, 2026 ?</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1.5px solid #f3f4f6', padding: '0 24px' }}>
          {tabs.map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 16px', cursor: 'pointer',
              fontSize: '13px', fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? '#111827' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid #111827' : '2px solid transparent', marginBottom: '-1.5px',
            }}>
              {tab}
              <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: activeTab === tab ? '#111827' : '#f3f4f6', color: activeTab === tab ? '#fff' : '#6b7280', fontWeight: 600 }}>
                {tabCounts(tab)}
              </span>
            </div>
          ))}
        </div>

        {/* Summary Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '8px' }}>Total Budget</div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              PHP {totalAmount.toLocaleString('en-PH')}.00
            </div>
            <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>
              {budgets.length} budget{budgets.length !== 1 ? 's' : ''} total
            </div>
          </div>
          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '8px' }}>Approved Budget</div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              PHP {approvedAmount.toLocaleString('en-PH')}.00
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>
              {budgets.filter(b => b.status === 'APPROVED').length} approved
            </div>
          </div>
          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
              <ClientChart>
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                </ResponsiveContainer>
              </ClientChart>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#111827' }}>PHP {(totalAmount / 1000000).toFixed(2)}M</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Pending', color: '#f59e0b', status: 'PENDING' },
                { label: 'Approved', color: '#10b981', status: 'APPROVED' },
                { label: 'Rejected', color: '#ef4444', status: 'REJECTED' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }}></span>
                  <div>
                    <div style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                      {item.label} ({budgets.filter(b => b.status === item.status).length})
                    </div>
                    <div style={{ fontSize: '12px', color: '#111827', fontWeight: 600 }}>
                      PHP {budgets.filter(b => b.status === item.status).reduce((s, b) => s + b.total, 0).toLocaleString('en-PH')}.00
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af' }}>??</span>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontFamily: font, fontSize: '13px', color: '#374151', outline: 'none', flex: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>? Columns</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>? Filters</span>
          </div>
        </div>

        {/* Table or Empty */}
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px' }}>
            <div style={{ fontSize: '40px', opacity: 0.2 }}>??</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af' }}>No budgets yet — click + Budget to create one</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '12px 24px', width: '40px', textAlign: 'left' }}><input type="checkbox" /></th>
                  {['Name', 'Project', 'Date', 'Total', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((budget, idx) => (
                  <tr key={budget.id} style={{ borderTop: '1px solid #f3f4f6', background: selected.includes(budget.id) ? '#f5f4ff' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '16px 24px' }}><input type="checkbox" checked={selected.includes(budget.id)} onChange={() => toggleSelect(budget.id)} /></td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{budget.name}</div>
                      {budget.description && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{budget.description.slice(0, 40)}{budget.description.length > 40 ? '...' : ''}</div>}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>{budget.project}</td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>{budget.date}</td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>PHP {budget.total.toLocaleString('en-PH')}.00</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: statusStyle[budget.status]?.bg, color: statusStyle[budget.status]?.color }}>
                        {budget.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', position: 'relative' }}>
                      <div onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === budget.id ? null : budget.id) }}
                        style={{ color: '#9ca3af', cursor: 'pointer', fontSize: '18px', fontWeight: 600, padding: '4px 8px', display: 'inline-block' }}>?</div>
                      {openMenu === budget.id && (
                        <div style={{ position: 'absolute', right: '40px', top: '8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}>
                          <div onClick={() => setOpenMenu(null)}
                            style={{ padding: '10px 16px', fontSize: '13px', color: '#374151', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            ?? Edit
                          </div>
                          <div onClick={() => handleDelete(budget.id)}
                            style={{ padding: '10px 16px', fontSize: '13px', color: '#ef4444', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            ??? Delete
                          </div>
                          <div onClick={() => handleDownload(budget)}
                            style={{ padding: '10px 16px', fontSize: '13px', color: '#374151', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            ?? Download PDF
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', padding: '16px 24px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
            Rows per page:
            <select style={{ fontFamily: font, fontSize: '13px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', color: '#374151' }}>
              <option>50</option><option>25</option><option>100</option>
            </select>
          </div>
          <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>1–{filtered.length} of {filtered.length}</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fafafa', cursor: 'pointer', color: '#9ca3af' }}>‹</button>
            <button style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fafafa', cursor: 'pointer', color: '#9ca3af' }}>›</button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '500px', position: 'relative' }}>
            <div onClick={() => setShowImportModal(false)} style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>?</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Import Budget</div>
            <div style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#fafafa', cursor: 'pointer', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px' }}>??</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>Select PDF or CSV file</div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Drop files here or click <span style={{ color: '#6c63ff', fontWeight: 600 }}>browse</span> thorough your machine</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6c63ff', fontWeight: 600, cursor: 'pointer' }}>Download Budget template</span>
              <button onClick={() => setShowImportModal(false)} style={{ padding: '10px 24px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: font, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
