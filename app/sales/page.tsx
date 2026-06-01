'use client'

import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Plus,
  Search,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { type CompanyRecord, companyChangeEvent, companyScopedKey, getActiveCompany, getCurrentActor } from '@/lib/tenant/company'
import { createProjectRecord, loadProjectManagementState, saveProjectManagementState } from '@/lib/project-management/service'
import { buildEmptyClient, loadClients as loadClientDatabase, saveClient, slugify, type ClientRecord as ClientDatabaseRecord } from '../people/clients/clientData'

type LeadStatus = 'New Inquiry' | 'Contacted' | 'Consultation Scheduled' | 'Qualified' | 'Lost'
type OpportunityStage = 'Lead' | 'Site Visit' | 'Site Inspection' | 'Proposal' | 'Negotiation' | 'Contract Review' | 'Awarded' | 'Not Awarded' | 'Won' | 'Lost'
type SiteVisitStatus = 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled'
type ProposalStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Revision Requested' | 'Approved' | 'Rejected'
type ContractStatus = 'Draft' | 'Pending Signature' | 'Active' | 'Completed' | 'Terminated'
type BillingStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue'

type Lead = {
  id: string
  companyId?: string
  leadName: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  projectType: string
  estimatedBudget: number
  location: string
  source: string
  salesRep: string
  status: LeadStatus
  createdDate: string
}

type Opportunity = {
  id: string
  companyId?: string
  name: string
  client: string
  clientId?: string
  projectType: string
  estimatedContractValue: number
  projectSize: string
  probability: number
  stage: OpportunityStage
  expectedCloseDate: string
  assignedTeam: string
  salesRep: string
  contactPerson?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
  lostReason?: string
}

type SiteVisit = {
  id: string
  companyId?: string
  client: string
  project: string
  siteAddress: string
  assignedProfessional: string
  schedule: string
  status: SiteVisitStatus
  notes: string
  measurements: string
  checklist: string
}

type Proposal = {
  id: string
  companyId?: string
  client: string
  projectName: string
  scopeOfWork: string
  boqSummary: string
  laborCost: number
  materialCost: number
  equipmentCost: number
  designFees: number
  vat: number
  discount: number
  total: number
  timeline: string
  paymentTerms: string
  validUntil: string
  status: ProposalStatus
}

type Contract = {
  id: string
  companyId?: string
  client: string
  projectName: string
  contractAmount: number
  downpayment: number
  retention: number
  startDate: string
  completionDate: string
  status: ContractStatus
  milestoneTracking: string
}

type ProgressBilling = {
  id: string
  companyId?: string
  project: string
  milestone: string
  amount: number
  dueDate: string
  paidAmount: number
  remainingBalance: number
  status: BillingStatus
}

type Client = {
  id: string
  companyId?: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  address: string
  activeProjects: number
  totalContractValue: number
  lastInteraction: string
  accountManager: string
}

type SalesForm = {
  clientId: string
  client: string
  projectName: string
  amount: string
  projectType: string
  location: string
  contactPerson: string
  email: string
  phone: string
  stage: OpportunityStage
  probability: string
  assignedTeam: string
  salesRep: string
  closeDate: string
  notes: string
}

type SalesWorkspaceData = {
  leads: Lead[]
  opportunities: Opportunity[]
  siteVisits: SiteVisit[]
  proposals: Proposal[]
  contracts: Contract[]
  billings: ProgressBilling[]
  clients: Client[]
}

const font = 'var(--font-body)'
const salesWorkspaceKey = 'wiseflow-sales-workspace'
const salesStages: { key: OpportunityStage; label: string }[] = [
  { key: 'Lead', label: 'Lead' },
  { key: 'Site Visit', label: 'Site Visit' },
  { key: 'Proposal', label: 'Proposal' },
  { key: 'Negotiation', label: 'Negotiation' },
  { key: 'Awarded', label: 'Awarded' },
  { key: 'Not Awarded', label: 'Not Awarded' },
]
const opportunityStages: OpportunityStage[] = salesStages.map(stage => stage.key)
const projectTypes = ['Residential', 'Commercial', 'Renovation', 'Interior Design', 'Office Fit-Out', 'Resort', 'Warehouse', 'Structural']
const periodOptions = ['Current period', 'This quarter', 'This year', 'All records'] as const
type SalesPeriod = typeof periodOptions[number]

function normalizeSalesStage(stage?: string): OpportunityStage {
  const key = (stage || '').trim().toLowerCase()
  if (key === 'site visit' || key === 'site inspection' || key === 'consultation' || key === 'consultation scheduled') return 'Site Visit'
  if (key === 'proposal' || key === 'proposal / boq' || key === 'proposal preparation' || key === 'submitted proposal' || key === 'quotation' || key === 'contract review') return 'Proposal'
  if (key === 'negotiation') return 'Negotiation'
  if (key === 'awarded' || key === 'won' || key === 'project awarded' || key === 'contract signing' || key === 'progress billing' || key === 'project handover') return 'Awarded'
  if (key === 'not awarded' || key === 'lost' || key === 'cancelled' || key === 'rejected') return 'Not Awarded'
  return 'Lead'
}

type SalesFilters = {
  stage: string
  projectType: string
  salesRep: string
  status: string
}

const emptyFilters: SalesFilters = {
  stage: 'All',
  projectType: 'All',
  salesRep: 'All',
  status: 'All',
}

const emptyForm: SalesForm = {
  clientId: '',
  client: '',
  projectName: '',
  amount: '',
  projectType: 'Residential',
  location: '',
  contactPerson: '',
  email: '',
  phone: '',
  stage: 'Lead',
  probability: '35',
  assignedTeam: 'Architecture / Engineering',
  salesRep: '',
  closeDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

const emptySalesWorkspace: SalesWorkspaceData = {
  leads: [],
  opportunities: [],
  siteVisits: [],
  proposals: [],
  contracts: [],
  billings: [],
  clients: [],
}

function initialOpportunityForm(rep = '', client?: ClientDatabaseRecord): SalesForm {
  const contact = client?.contacts.find(item => item.primary) || client?.contacts[0]
  return {
    ...emptyForm,
    clientId: client?.id || '',
    client: client ? clientDisplayName(client) : '',
    contactPerson: contact?.name || client?.accountManager || '',
    email: contact?.email || client?.email || '',
    phone: contact?.phone || client?.phone || '',
    location: client?.billingAddress && client.billingAddress !== '-' ? client.billingAddress : '',
    salesRep: client?.accountManager || rep,
  }
}

export default function SalesPage() {
  const [opportunityStatus, setOpportunityStatus] = useState('All')
  const [clientFilter, setClientFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [period, setPeriod] = useState<SalesPeriod>('Current period')
  const [salesFilters, setSalesFilters] = useState<SalesFilters>(emptyFilters)
  const [form, setForm] = useState<SalesForm>(emptyForm)
  const [notice, setNotice] = useState('')
  const [activeCompany, setActiveCompany] = useState<CompanyRecord | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [billings, setBillings] = useState<ProgressBilling[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientDatabase, setClientDatabase] = useState<ClientDatabaseRecord[]>([])
  const storageReady = useRef(false)

  useEffect(() => {
    const loadWorkspace = () => {
      const company = getActiveCompany()
      setActiveCompany(company)
      const data = loadSalesWorkspace(company?.id)
      setLeads(data.leads)
      setOpportunities(data.opportunities)
      setSiteVisits(data.siteVisits)
      setProposals(data.proposals)
      setContracts(data.contracts)
      setBillings(data.billings)
      setClients(data.clients)
      storageReady.current = true
      void loadClientDatabase()
        .then(result => setClientDatabase(result.clients))
        .catch(() => setClientDatabase([]))
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
    saveSalesWorkspace(activeCompany.id, { leads, opportunities, siteVisits, proposals, contracts, billings, clients })
  }, [activeCompany?.id, billings, clients, contracts, leads, opportunities, proposals, siteVisits])

  const salesRepOptions = useMemo(() => getSalesRepOptions(activeCompany), [activeCompany])
  const clientOptions = useMemo(() => clientDatabase.map(client => ({ value: client.id, label: clientDisplayName(client) })), [clientDatabase])
  const selectedClient = useMemo(() => clientDatabase.find(client => client.id === form.clientId), [clientDatabase, form.clientId])
  const filtered = useMemo(
    () => filterRows({ leads, opportunities, siteVisits, proposals, contracts, billings, clients }, query, period, salesFilters),
    [billings, clients, contracts, leads, opportunities, period, proposals, query, salesFilters, siteVisits],
  )
  const normalizedOpportunities = useMemo(
    () => filtered.opportunities.map(item => ({ ...item, stage: normalizeSalesStage(item.stage) })),
    [filtered.opportunities],
  )
  const salesStatusOptions = useMemo(() => ['All', ...Array.from(new Set([
    ...leads.map(item => item.status),
    ...siteVisits.map(item => item.status),
    ...proposals.map(item => item.status),
    ...contracts.map(item => item.status),
    ...billings.map(item => item.status),
  ]))], [billings, contracts, leads, proposals, siteVisits])
  const activeFilterCount = Object.values(salesFilters).filter(value => value !== 'All').length + (period === 'Current period' ? 0 : 1)
  const opportunityListTabs = useMemo(() => {
    const awardedByYear = (year: number) => normalizedOpportunities.filter(item => normalizeSalesStage(item.stage) === 'Awarded' && new Date(`${item.expectedCloseDate}T00:00:00`).getFullYear() === year).length
    return [
      { label: 'All', count: normalizedOpportunities.length },
      { label: 'Pending', count: normalizedOpportunities.filter(item => ['Lead', 'Site Visit', 'Proposal'].includes(normalizeSalesStage(item.stage))).length },
      { label: 'Negotiations', count: normalizedOpportunities.filter(item => normalizeSalesStage(item.stage) === 'Negotiation').length },
      { label: 'Awarded 2024', count: awardedByYear(2024) },
      { label: 'Awarded 2025', count: awardedByYear(2025) },
      { label: 'Declined', count: normalizedOpportunities.filter(item => normalizeSalesStage(item.stage) === 'Not Awarded').length },
    ]
  }, [normalizedOpportunities])
  const clientFilterOptions = useMemo(() => ['All', ...Array.from(new Set(normalizedOpportunities.map(item => item.client).filter(Boolean)))], [normalizedOpportunities])
  const visibleOpportunities = useMemo(() => normalizedOpportunities.filter(item => {
    const stage = normalizeSalesStage(item.stage)
    const closeYear = new Date(`${item.expectedCloseDate}T00:00:00`).getFullYear()
    const statusMatch = opportunityStatus === 'All'
      || (opportunityStatus === 'Pending' && ['Lead', 'Site Visit', 'Proposal'].includes(stage))
      || (opportunityStatus === 'Negotiations' && stage === 'Negotiation')
      || (opportunityStatus === 'Awarded 2024' && stage === 'Awarded' && closeYear === 2024)
      || (opportunityStatus === 'Awarded 2025' && stage === 'Awarded' && closeYear === 2025)
      || (opportunityStatus === 'Declined' && stage === 'Not Awarded')
    const clientMatch = clientFilter === 'All' || item.client === clientFilter
    return statusMatch && clientMatch
  }), [clientFilter, normalizedOpportunities, opportunityStatus])
  const salesMetrics = useMemo(() => {
    const pipelineValue = normalizedOpportunities.reduce((sum, item) => sum + item.estimatedContractValue, 0)
    const weightedValue = normalizedOpportunities.reduce((sum, item) => sum + item.estimatedContractValue * Math.max(item.probability, 0) / 100, 0)
    const awardedCount = normalizedOpportunities.filter(item => normalizeSalesStage(item.stage) === 'Awarded').length
    const activeClients = new Set(normalizedOpportunities.map(item => item.client).filter(Boolean)).size

    return [
      { label: 'Open opportunities', value: String(normalizedOpportunities.length), detail: `${visibleOpportunities.length} in current view`, icon: Target, color: '#16a34a' },
      { label: 'Pipeline value', value: money(pipelineValue), detail: `${period} scope`, icon: BadgeDollarSign, color: '#2563eb' },
      { label: 'Weighted budget', value: money(weightedValue), detail: 'Probability adjusted', icon: TrendingUp, color: '#f59e0b' },
      { label: 'Awarded deals', value: String(awardedCount), detail: `${activeClients} active clients`, icon: Award, color: '#8b5cf6' },
    ]
  }, [normalizedOpportunities, period, visibleOpportunities.length])

  const applyClientSelection = (clientId: string) => {
    const client = clientDatabase.find(item => item.id === clientId)
    setForm(current => {
      if (!client) return { ...current, clientId, client: '' }
      const contact = client.contacts.find(item => item.primary) || client.contacts[0]
      return {
        ...current,
        clientId,
        client: clientDisplayName(client),
        contactPerson: contact?.name || client.accountManager || current.contactPerson,
        email: contact?.email || client.email || current.email,
        phone: contact?.phone || client.phone || current.phone,
        location: client.billingAddress && client.billingAddress !== '-' ? client.billingAddress : current.location,
        salesRep: client.accountManager || current.salesRep || salesRepOptions[0] || '',
      }
    })
  }

  const createQuickOpportunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(form.amount)
    const clientName = selectedClient ? clientDisplayName(selectedClient) : form.client.trim()
    if (!clientName || !form.projectName.trim() || !Number.isFinite(value) || value <= 0) {
      setNotice('Select a client, project name, and estimated contract value before creating an opportunity.')
      return
    }
    if (clientDatabase.length > 0 && !form.clientId) {
      setNotice('Select a client from Client Database before saving the opportunity.')
      return
    }

    const rep = form.salesRep.trim() || salesRepOptions[0] || 'Unassigned'
    const probability = Math.min(100, Math.max(0, Number(form.probability) || 35))
    const databaseClient = selectedClient || await ensureClientDatabaseRecord(clientName, rep, form.email.trim(), form.phone.trim(), form.location.trim(), value)
    const next: Opportunity = {
      id: nextCode('OP', opportunities.map(item => item.id)),
      companyId: activeCompany?.id,
      name: form.projectName.trim(),
      client: clientName,
      clientId: databaseClient?.id || form.clientId || undefined,
      projectType: form.projectType,
      estimatedContractValue: value,
      projectSize: form.location.trim() || selectedClient?.billingAddress || 'To be assessed',
      probability,
      stage: form.stage,
      expectedCloseDate: form.closeDate,
      assignedTeam: form.assignedTeam.trim() || 'Architecture / Engineering',
      salesRep: rep,
      contactPerson: form.contactPerson.trim(),
      contactEmail: form.email.trim(),
      contactPhone: form.phone.trim(),
      notes: form.notes.trim(),
    }
    setOpportunities(current => [next, ...current])
    ensureClient(clientName, rep, value, form.email.trim(), form.phone.trim(), form.location.trim())
    setForm(initialOpportunityForm(salesRepOptions[0] || '', clientDatabase[0]))
    setDrawerOpen(false)
    setNotice('Project opportunity created in the acquisition pipeline.')
  }

  const ensureClientDatabaseRecord = async (name: string, manager: string, email = '', phone = '', address = '', amount = 0) => {
    const existing = clientDatabase.find(client => clientDisplayName(client).toLowerCase() === name.toLowerCase())
    if (existing) return existing

    const id = uniqueClientId(slugify(name), clientDatabase)
    const client = buildEmptyClient({
      id,
      name,
      company: `${slugify(name)}.com`,
      email: email || 'client@example.com',
      phone: phone || '-',
      industry: 'Construction',
      companyType: 'Private',
      billingAddress: address || '-',
      accountManager: manager,
      activeProjects: amount ? 1 : 0,
      totalProjects: amount ? 1 : 0,
      totalRevenue: amount,
      outstandingRevenue: amount,
      contacts: [{
        id: `${id}-primary`,
        name: manager || name,
        role: 'Primary contact',
        email: email || 'client@example.com',
        phone: phone || '-',
        primary: true,
      }],
      tags: ['Sales'],
      description: 'Created from a sales opportunity.',
    })

    const result = await saveClient(client)
    setClientDatabase(current => [result.client, ...current.filter(item => item.id !== result.client.id)])
    return result.client
  }

  const scheduleSiteVisit = (opportunity: Opportunity) => {
    const visit: SiteVisit = {
      id: nextCode('SV', siteVisits.map(item => item.id)),
      companyId: activeCompany?.id,
      client: opportunity.client,
      project: opportunity.name,
      siteAddress: opportunity.projectSize || 'To be confirmed',
      assignedProfessional: opportunity.assignedTeam,
      schedule: opportunity.expectedCloseDate,
      status: 'Scheduled',
      notes: 'Initial consultation and site inspection checklist pending.',
      measurements: 'Pending measurement survey',
      checklist: 'Photos, access, utilities, site constraints',
    }
    setSiteVisits(current => [visit, ...current])
    setOpportunities(current => current.map(item => item.id === opportunity.id ? { ...item, stage: 'Site Visit', probability: Math.max(item.probability, 45) } : item))
    setNotice(`${visit.id} scheduled for ${opportunity.client}.`)
  }

  const convertOpportunityToProject = (opportunity: Opportunity) => {
    const stage = normalizeSalesStage(opportunity.stage)
    if (stage !== 'Awarded') {
      setNotice('Move the opportunity to Awarded before creating a project.')
      return
    }

    const state = loadProjectManagementState()
    const existing = state.projects.find(project => project.opportunitySource === 'sales' && project.opportunityId === opportunity.id)
    if (existing) {
      setNotice(`${existing.name} is already linked to ${opportunity.id}.`)
      return
    }

    const clientId = opportunity.clientId || state.clients.find(client => client.name.toLowerCase() === opportunity.client.toLowerCase())?.id || 'client-local'
    const clients = state.clients.some(client => client.id === clientId) ? state.clients : [...state.clients, { id: clientId, name: opportunity.client }]
    const nextState = createProjectRecord({ ...state, clients }, {
      name: opportunity.name,
      clientId,
      description: opportunity.notes || `Converted from sales opportunity ${opportunity.id}.`,
      budget: opportunity.estimatedContractValue,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: opportunity.expectedCloseDate,
      department: opportunity.assignedTeam || 'Sales',
      projectType: opportunity.projectType,
      tags: ['Sales converted'],
      location: {
        address: opportunity.projectSize || 'To be confirmed',
        city: '',
        province: '',
        postalCode: '',
      },
      opportunityId: opportunity.id,
      opportunitySource: 'sales',
    })

    saveProjectManagementState(nextState)
    setOpportunities(current => current.map(item => item.id === opportunity.id ? { ...item, probability: 100, stage: 'Awarded' } : item))
    setNotice(`${opportunity.name} was created in Project Management.`)
  }

  const ensureClient = (name: string, manager: string, amount = 0, email = '', phone = '', address = '') => {
    setClients(current => {
      const exists = current.find(client => client.companyName.toLowerCase() === name.toLowerCase())
      if (exists) {
        return current.map(client => client.id === exists.id ? {
          ...client,
          activeProjects: client.activeProjects || 1,
          totalContractValue: Math.max(client.totalContractValue, client.totalContractValue + amount),
          lastInteraction: new Date().toISOString().slice(0, 10),
        } : client)
      }
      return [{
        id: nextCode('CLI', current.map(client => client.id)),
        companyId: activeCompany?.id,
        companyName: name,
        contactPerson: manager,
        email,
        phone,
        address,
        activeProjects: amount ? 1 : 0,
        totalContractValue: amount,
        lastInteraction: new Date().toISOString().slice(0, 10),
        accountManager: manager,
      }, ...current]
    })
  }

  const updateFilter = (key: keyof SalesFilters, value: string) => {
    setSalesFilters(current => ({ ...current, [key]: value }))
  }

  const exportSalesData = () => {
    const rows = visibleOpportunities.map(row => ({ section: 'Opportunity', ...row, stage: normalizeSalesStage(row.stage) }))
    if (!rows.length) {
      setNotice('No opportunity records to export for the current filters.')
      return
    }
    downloadCsv('wiseflow-sales-opportunities.csv', rows)
    setNotice(`${rows.length} opportunity record${rows.length === 1 ? '' : 's'} exported.`)
  }

  return (
    <div className="sales-page" style={salesPage}>
      <style>{salesThemeCss}</style>
      <section className="sales-dashboard-hero">
        <div className="sales-dashboard-inner">
          <PageHeader
            crumb="Sales / Opportunities"
            title="Opportunities"
            subtitle={`List, filter, and hand off sales opportunities for ${activeCompany?.name || 'the selected company'}.`}
            actions={(
              <>
                <div style={{ position: 'relative' }}>
                  <ToolbarButton icon={<CalendarDays size={16} />} label={period} hasChevron onClick={() => { setPeriodOpen(value => !value); setFiltersOpen(false) }} />
                  {periodOpen ? (
                    <div style={periodMenu}>
                      {periodOptions.map(option => (
                        <button key={option} type="button" onClick={() => { setPeriod(option); setPeriodOpen(false) }} style={menuOption(period === option)}>
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button type="button" onClick={() => { setDrawerOpen(true); setForm(initialOpportunityForm(salesRepOptions[0] || '', clientDatabase[0])); setFiltersOpen(false) }} style={primaryButton}><Plus size={16} /> Opportunity</button>
                <ToolbarButton icon={<Download size={16} />} label="Export" onClick={exportSalesData} />
              </>
            )}
          />

          <section className="sales-kpi-grid" aria-label="Sales pipeline summary">
            {salesMetrics.map(metric => <SalesMetricCard key={metric.label} {...metric} />)}
          </section>
        </div>
      </section>

      <section className="sales-dashboard-content">
        {notice ? <div className="sales-notice" style={successBox}>{notice}<button onClick={() => setNotice('')} style={dismissButton}><X size={14} /></button></div> : null}

        {filtersOpen ? (
          <section className="sales-filter-panel" style={filterPanel}>
            <SelectField label="Stage" value={salesFilters.stage} onChange={value => updateFilter('stage', value)} options={['All', ...opportunityStages]} />
            <SelectField label="Project Type" value={salesFilters.projectType} onChange={value => updateFilter('projectType', value)} options={['All', ...projectTypes]} />
            <SelectField label="Sales Rep" value={salesFilters.salesRep} onChange={value => updateFilter('salesRep', value)} options={['All', ...salesRepOptions]} />
            <SelectField label="Status" value={salesFilters.status} onChange={value => updateFilter('status', value)} options={salesStatusOptions} />
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <button type="button" onClick={() => { setSalesFilters(emptyFilters); setPeriod('Current period') }} style={{ ...secondaryButton, width: '100%' }}>Reset filters</button>
            </div>
          </section>
        ) : null}

        <Panel
          title="Opportunity List"
          action={<ToolbarButton icon={<Filter size={16} />} label={activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters'} onClick={() => { setFiltersOpen(value => !value); setPeriodOpen(false) }} />}
        >
          <div className="sales-opportunity-tabs" style={opportunityTabs}>
            {opportunityListTabs.map(tab => (
              <button key={tab.label} type="button" className={opportunityStatus === tab.label ? 'is-active' : undefined} onClick={() => setOpportunityStatus(tab.label)} style={opportunityTabStyle(opportunityStatus === tab.label)}>
                {tab.label}<span>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="sales-opportunity-toolbar" style={opportunityToolbar}>
            <label style={opportunityClientFilter}>
              <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} style={opportunitySelect}>
                {clientFilterOptions.map(option => <option key={option} value={option}>{option === 'All' ? 'Clients' : option}</option>)}
              </select>
              <ChevronDown size={15} />
            </label>
            <SearchFilter search={query} setSearch={setQuery} />
          </div>
          <OpportunityTable opportunities={visibleOpportunities} onScheduleVisit={scheduleSiteVisit} onConvertProject={convertOpportunityToProject} />
        </Panel>
      </section>

      {drawerOpen ? (
        <div style={overlay}>
          <form onSubmit={createQuickOpportunity} style={drawer}>
            <div style={drawerHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--sales-foreground)' }}>Create Project Opportunity</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--sales-muted)', fontSize: 13 }}>Create a sales opportunity and track it through the pipeline.</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} style={iconButton}><X size={18} /></button>
            </div>
            <div style={formGrid}>
              <OptionSelectField label="Client / Company" value={form.clientId} onChange={applyClientSelection} options={clientOptions} placeholder={clientOptions.length ? 'Select a client from Client Database' : 'No Client Database records yet'} required />
              {selectedClient ? (
                <div style={clientPreview}>
                  <strong style={{ color: 'var(--sales-foreground)' }}>{clientDisplayName(selectedClient)}</strong>
                  <span>{form.contactPerson || 'No contact person'}{form.email ? ` - ${form.email}` : ''}</span>
                  <span>{form.phone || 'No phone number'}{form.location ? ` - ${form.location}` : ''}</span>
                </div>
              ) : (
                <p style={fieldHint}>Clients come from the Client Database. Add a client there first, then select it here.</p>
              )}
              <TextField label="Project Name" value={form.projectName} onChange={value => setForm(current => ({ ...current, projectName: value }))} required />
              <TextField label="Estimated Contract Value" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" prefix="PHP" required />
              <SelectField label="Project Type" value={form.projectType} onChange={value => setForm(current => ({ ...current, projectType: value }))} options={projectTypes} />
              <TextField label="Location / Site Address" value={form.location} onChange={value => setForm(current => ({ ...current, location: value }))} />
              <TextField label="Contact Person" value={form.contactPerson} onChange={value => setForm(current => ({ ...current, contactPerson: value }))} />
              <TextField label="Contact Email" value={form.email} onChange={value => setForm(current => ({ ...current, email: value }))} type="email" />
              <TextField label="Contact Phone" value={form.phone} onChange={value => setForm(current => ({ ...current, phone: value }))} />
              <SelectField label="Sales Stage" value={form.stage} onChange={value => setForm(current => ({ ...current, stage: value as OpportunityStage }))} options={opportunityStages} />
              <TextField label="Probability (%)" value={form.probability} onChange={value => setForm(current => ({ ...current, probability: value }))} type="number" />
              <TextField label="Assigned Team" value={form.assignedTeam} onChange={value => setForm(current => ({ ...current, assignedTeam: value }))} />
              <SelectField label="Sales Rep" value={form.salesRep} onChange={value => setForm(current => ({ ...current, salesRep: value }))} options={salesRepOptions} />
              <TextField label="Expected Closing Date" value={form.closeDate} onChange={value => setForm(current => ({ ...current, closeDate: value }))} type="date" />
              <TextAreaField label="Opportunity Notes" value={form.notes} onChange={value => setForm(current => ({ ...current, notes: value }))} />
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

function OpportunityTable({ opportunities, onScheduleVisit, onConvertProject }: { opportunities: Opportunity[]; onScheduleVisit: (opportunity: Opportunity) => void; onConvertProject: (opportunity: Opportunity) => void }) {
  if (!opportunities.length) return <EmptyState title="No opportunities found" body="Change the filters or create a new opportunity." />

  return (
    <DataTable headers={['Title', 'Client', 'Duration', 'Quotation', 'Budget', 'Status', 'Action']}>
      {opportunities.map(opportunity => {
        const stage = normalizeSalesStage(opportunity.stage)
        return (
          <tr key={opportunity.id}>
            <Cell strong>
              <span style={{ display: 'grid', gap: 3 }}>
                <span>{opportunity.name}</span>
                <small style={{ color: 'var(--sales-muted)', fontWeight: 500 }}>{opportunity.projectSize || opportunity.projectType}</small>
              </span>
            </Cell>
            <Cell>
              <span style={{ display: 'grid', gap: 3 }}>
                <span>{opportunity.client}</span>
                <small style={{ color: 'var(--sales-muted)', fontWeight: 500 }}>{opportunity.contactEmail || opportunity.salesRep || 'Unassigned'}</small>
              </span>
            </Cell>
            <Cell>{dateRange(opportunity.expectedCloseDate)}</Cell>
            <Cell>{money(opportunity.estimatedContractValue)}</Cell>
            <Cell>{money(opportunity.estimatedContractValue * Math.max(opportunity.probability, 0) / 100)}</Cell>
            <Cell><Badge text={stage === 'Not Awarded' ? 'Declined' : stage} /></Cell>
            <Cell>
              {stage === 'Lead' ? <button type="button" onClick={() => onScheduleVisit(opportunity)} style={smallButton}>Site Visit</button> : null}
              {stage === 'Awarded' ? <button type="button" onClick={() => onConvertProject(opportunity)} style={smallButton}>Create Project</button> : null}
              {!['Lead', 'Awarded'].includes(stage) ? <span style={{ color: 'var(--sales-muted)' }}>-</span> : null}
            </Cell>
          </tr>
        )
      })}
    </DataTable>
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

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="sales-panel" style={panel}>
      <div className="sales-panel-header" style={panelHeader}><h2 style={panelTitle}>{title}</h2>{action}</div>
      {children}
    </section>
  )
}

function PageHeader({ crumb, title, subtitle, actions }: { crumb: string; title: string; subtitle: string; actions: ReactNode }) {
  return (
    <div className="sales-page-header" style={pageHeader}>
      <div>
        <div className="sales-breadcrumb" style={breadcrumb}>{crumb}</div>
        <h1 style={h1}>{title}</h1>
        <p style={subtitleStyle}>{subtitle}</p>
      </div>
      <div className="sales-header-actions" style={actionsWrap}>{actions}</div>
    </div>
  )
}

function SalesMetricCard({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: LucideIcon; color: string }) {
  return (
    <article className="sales-metric-card">
      <span className="sales-metric-icon" style={{ '--sales-metric-color': color } as CSSProperties}>
        <Icon size={18} />
      </span>
      <span>
        <small className="sales-stat-label">{label}</small>
        <strong className="sales-stat-value">{value}</strong>
        <small className="sales-stat-detail">{detail}</small>
      </span>
    </article>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div style={emptyState}><strong>{title}</strong><p>{body}</p></div>
}

function SearchFilter({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return <label className="sales-panel-search" style={searchBox}><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search CRM & Sales..." style={bareInput} /></label>
}

function ToolbarButton({ icon, label, hasChevron, onClick }: { icon: ReactNode; label: string; hasChevron?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} style={secondaryButton}>{icon}{label}{hasChevron ? <ChevronDown size={14} /> : null}</button>
}

function TextField({ label, value, onChange, required, type = 'text', prefix }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; prefix?: string }) {
  return <label style={fieldWrap}><span style={labelStyle}>{label}{required ? <b> *</b> : null}</span><span style={{ position: 'relative' }}>{prefix ? <span style={prefixStyle}>{prefix}</span> : null}<input type={type} value={value} onChange={event => onChange(event.target.value)} style={{ ...inputStyle, paddingLeft: prefix ? 42 : 12 }} /></span></label>
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return <label style={fieldWrap}><span style={labelStyle}>{label}{required ? <b> *</b> : null}</span><select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>{options.map(option => <option key={option}>{option}</option>)}</select></label>
}

function OptionSelectField({ label, value, onChange, options, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder?: string; required?: boolean }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <select value={value} onChange={event => onChange(event.target.value)} style={inputStyle} disabled={!options.length} required={required}>
        <option value="">{placeholder || 'Select an option'}</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function TextAreaField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}{required ? <b> *</b> : null}</span>
      <textarea value={value} onChange={event => onChange(event.target.value)} rows={4} style={{ ...inputStyle, height: 'auto', minHeight: 96, padding: '12px', resize: 'vertical' }} />
    </label>
  )
}

function Badge({ text }: { text: string }) {
  const color = text.includes('Paid') || text === 'Won' || text === 'Qualified' || text === 'Active' || text === 'Approved' || text === 'Completed'
    ? ['color-mix(in srgb, var(--sales-success) 13%, transparent)', 'var(--sales-success)']
    : text.includes('Lost') || text === 'Cancelled' || text === 'Overdue' || text === 'Rejected' || text === 'Terminated'
      ? ['color-mix(in srgb, var(--sales-danger) 13%, transparent)', 'var(--sales-danger)']
      : text.includes('Review') || text.includes('Negotiation') || text === 'Submitted' || text === 'Pending Signature'
        ? ['color-mix(in srgb, var(--sales-warning) 13%, transparent)', 'var(--sales-warning)']
        : ['var(--sales-card-hover)', 'var(--sales-muted)']
  return <span style={{ background: color[0], color: color[1], borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', border: '1px solid var(--sales-border-soft)' }}>{text}</span>
}

function loadSalesWorkspace(companyId?: string): SalesWorkspaceData {
  const empty = companyScopedSalesData(companyId)
  if (typeof window === 'undefined' || !companyId) return empty

  try {
    const stored = window.localStorage.getItem(companyScopedKey(salesWorkspaceKey, companyId))
    if (!stored) return empty
    const parsed = JSON.parse(stored) as Partial<SalesWorkspaceData> & Record<string, unknown>
    return companyScopedSalesData(companyId, {
      leads: normalizeCompanyRows(parsed.leads as Lead[] | undefined, companyId),
      opportunities: normalizeCompanyRows(parsed.opportunities as Opportunity[] | undefined, companyId),
      siteVisits: normalizeCompanyRows(parsed.siteVisits as SiteVisit[] | undefined, companyId),
      proposals: normalizeCompanyRows(parsed.proposals as Proposal[] | undefined, companyId),
      contracts: normalizeCompanyRows(parsed.contracts as Contract[] | undefined, companyId),
      billings: normalizeCompanyRows(parsed.billings as ProgressBilling[] | undefined, companyId),
      clients: normalizeCompanyRows(parsed.clients as Client[] | undefined, companyId),
    })
  } catch {
    return empty
  }
}

function saveSalesWorkspace(companyId: string, data: SalesWorkspaceData) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(companyScopedKey(salesWorkspaceKey, companyId), JSON.stringify(companyScopedSalesData(companyId, data)))
}

function companyScopedSalesData(companyId?: string, data?: SalesWorkspaceData): SalesWorkspaceData {
  const source = data || emptySalesWorkspace
  return {
    leads: source.leads.map(item => ({ ...item, companyId })),
    opportunities: source.opportunities.map(item => ({ ...item, stage: normalizeSalesStage(item.stage), companyId })),
    siteVisits: source.siteVisits.map(item => ({ ...item, companyId })),
    proposals: source.proposals.map(item => ({ ...item, companyId })),
    contracts: source.contracts.map(item => ({ ...item, companyId })),
    billings: source.billings.map(item => ({ ...item, companyId })),
    clients: source.clients.map(item => ({ ...item, companyId })),
  }
}

function normalizeCompanyRows<T extends { companyId?: string }>(rows: T[] | undefined, companyId: string) {
  if (!Array.isArray(rows)) return []
  return rows.map(row => ({ ...row, companyId })).filter(row => row.companyId === companyId)
}

function filterRows(data: SalesWorkspaceData, query: string, period: SalesPeriod, filters: SalesFilters) {
  const q = query.trim().toLowerCase()
  const filter = <T,>(rows: T[], dateOf: (row: T) => string, matches: (row: T) => boolean = () => true) => rows.filter(row => {
    const searchMatch = !q || JSON.stringify(row).toLowerCase().includes(q)
    return searchMatch && inSelectedPeriod(dateOf(row), period) && matches(row)
  })
  return {
    leads: filter(data.leads, row => row.createdDate, row => matchesOption(filters.projectType, row.projectType) && matchesOption(filters.salesRep, row.salesRep) && matchesOption(filters.status, row.status)),
    opportunities: filter(data.opportunities, row => row.expectedCloseDate, row => matchesOption(filters.projectType, row.projectType) && matchesOption(filters.salesRep, row.salesRep) && matchesOption(filters.stage, normalizeSalesStage(row.stage))),
    siteVisits: filter(data.siteVisits, row => row.schedule, row => matchesOption(filters.status, row.status)),
    proposals: filter(data.proposals, row => row.validUntil, row => matchesOption(filters.status, row.status)),
    contracts: filter(data.contracts, row => row.startDate || row.completionDate, row => matchesOption(filters.status, row.status)),
    billings: filter(data.billings, row => row.dueDate, row => matchesOption(filters.status, row.status)),
    clients: filter(data.clients, row => row.lastInteraction, row => matchesOption(filters.salesRep, row.accountManager)),
  }
}

function matchesOption(selected: string, value: string) {
  return selected === 'All' || value === selected
}

function inSelectedPeriod(value: string, period: SalesPeriod) {
  if (period === 'All records') return true
  const dateValue = new Date(`${value}T00:00:00`)
  if (Number.isNaN(dateValue.getTime())) return false
  const today = new Date()
  if (period === 'Current period') {
    return dateValue.getFullYear() === today.getFullYear() && dateValue.getMonth() === today.getMonth()
  }
  if (period === 'This year') return dateValue.getFullYear() === today.getFullYear()
  const currentQuarter = Math.floor(today.getMonth() / 3)
  return dateValue.getFullYear() === today.getFullYear() && Math.floor(dateValue.getMonth() / 3) === currentQuarter
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (typeof window === 'undefined') return
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach(key => set.add(key))
    return set
  }, new Set<string>()))
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvCell(row[header])).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function getSalesRepOptions(company: CompanyRecord | null) {
  const memberNames = (company?.members || [])
    .filter(member => member.status === 'Active' && ['Owner', 'Admin', 'Sales', 'Manager'].includes(member.role))
    .map(member => member.name || member.email)
    .filter(Boolean)
  const actor = getCurrentActor()
  const actorName = actor.fullName || actor.name || actor.email
  const options = Array.from(new Set([actorName, ...memberNames].filter(Boolean))) as string[]
  return options.length ? options : ['Unassigned']
}

function clientDisplayName(client: ClientDatabaseRecord) {
  return client.name || client.company || client.email || 'Unnamed client'
}

function uniqueClientId(baseId: string, clients: ClientDatabaseRecord[]) {
  if (!clients.some(client => client.id === baseId)) return baseId
  let suffix = 2
  while (clients.some(client => client.id === `${baseId}-${suffix}`)) suffix += 1
  return `${baseId}-${suffix}`
}

function nextCode(prefix: string, ids: string[]) {
  const next = ids.reduce((max, id) => {
    const number = Number(id.replace(/\D/g, ''))
    return Number.isFinite(number) ? Math.max(max, number) : max
  }, 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}

function money(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value || 0)
}

function date(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value || '-' : parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function dateRange(value: string) {
  const formatted = date(value)
  return formatted === '-' ? '-' : `${formatted} - ${formatted}`
}

const salesThemeCss = `
.sales-page {
  --sales-background: var(--background);
  --sales-sidebar: var(--sidebar);
  --sales-card: var(--card);
  --sales-card-hover: var(--card-hover);
  --sales-card-subtle: var(--secondary);
  --sales-border: var(--border);
  --sales-border-soft: var(--border-soft);
  --sales-foreground: var(--foreground);
  --sales-muted: var(--muted-foreground);
  --sales-placeholder: var(--placeholder);
  --sales-primary: var(--primary);
  --sales-primary-foreground: var(--primary-foreground);
  --sales-input: var(--input);
  --sales-input-border: var(--input-border);
  --sales-success: var(--success);
  --sales-warning: var(--warning);
  --sales-danger: var(--danger);
  --sales-shadow: var(--shadow-sm);
  --sales-radius: var(--radius-card);
  --sales-radius-sm: var(--radius-control);
  --sales-space-3: 12px;
  --sales-space-4: 16px;
  --sales-space-5: 24px;
  font-family: var(--font-body), "Geist Sans", "Geist Fallback", sans-serif !important;
}
.sales-page *,
.sales-page *::before,
.sales-page *::after {
  box-sizing: border-box;
  font-family: var(--font-body), "Geist Sans", "Geist Fallback", sans-serif !important;
  letter-spacing: 0;
}
.sales-page h1,
.sales-page h2,
.sales-page h3,
.sales-page strong,
.sales-page b {
  color: var(--sales-foreground) !important;
}
.sales-page p,
.sales-page small,
.sales-page span {
  line-height: 1.45;
}
.sales-page button,
.sales-page input,
.sales-page select,
.sales-page textarea {
  font-family: var(--font-body), "Geist Sans", "Geist Fallback", sans-serif !important;
}
.sales-page button:hover,
.sales-page a:hover {
  transform: none !important;
}
.sales-page input::placeholder,
.sales-page textarea::placeholder {
  color: var(--sales-placeholder) !important;
}
.sales-page .sales-kpi-grid {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  overflow: visible !important;
}
.sales-page input:focus,
.sales-page select:focus,
.sales-page textarea:focus {
  border-color: var(--sales-primary) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sales-primary) 8%, transparent) !important;
}
.sales-page .sales-metric-card,
.sales-page article {
  background: var(--sales-card) !important;
  border-color: var(--sales-border) !important;
  color: var(--sales-foreground) !important;
  box-shadow: var(--sales-shadow) !important;
}
.sales-page .sales-metric-card {
  background: linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012)) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.035) !important;
}
.sales-page .sales-metric-card * {
  color: inherit !important;
}
.sales-page .sales-metric-card svg {
  stroke: currentColor !important;
}
.sales-page .sales-stat-label,
.sales-page .sales-stat-detail {
  color: var(--sales-muted) !important;
}
.sales-page .sales-stat-value,
.sales-page .sales-metric-icon {
  color: var(--sales-foreground) !important;
}
.sales-page .sales-metric-icon {
  background: transparent !important;
}
.sales-page .sales-metric-card:hover,
.sales-page article:hover {
  background: var(--sales-card-hover) !important;
}
.sales-page .sales-metric-card:hover {
  background: linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02)) !important;
}
.sales-page table {
  border-collapse: collapse !important;
  border-spacing: 0 !important;
}
.sales-page tbody tr:hover td {
  background: var(--sales-card-hover) !important;
}
.sales-page .sales-tabs.sales-tabs {
  display: flex !important;
  align-items: flex-end !important;
  gap: 12px !important;
  min-height: 50px !important;
  border-bottom: 1px solid var(--sales-border) !important;
  background: transparent !important;
  box-shadow: none !important;
  overflow-x: auto !important;
}
.sales-page .sales-tabs.sales-tabs button {
  flex: 0 0 72px !important;
  width: 72px !important;
  min-width: 72px !important;
  max-width: 72px !important;
  min-height: 50px !important;
  margin: 0 !important;
  padding: 0 0 14px !important;
  display: inline-flex !important;
  align-items: flex-end !important;
  justify-content: flex-start !important;
  background: transparent !important;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--sales-muted) !important;
  cursor: pointer;
  font-size: 13px !important;
  font-weight: 500 !important;
  line-height: 1 !important;
  text-align: left !important;
  text-decoration: none !important;
  transform: none !important;
  white-space: nowrap !important;
}
.sales-page .sales-tabs.sales-tabs button:hover,
.sales-page .sales-tabs.sales-tabs button:focus-visible {
  color: var(--sales-foreground) !important;
  border-bottom-color: transparent !important;
  text-decoration: none !important;
}
.sales-page .sales-tabs.sales-tabs button.is-active,
.sales-page .sales-tabs.sales-tabs button.is-active:hover,
.sales-page .sales-tabs.sales-tabs button.is-active:focus-visible {
  color: var(--sales-foreground) !important;
  border-bottom-color: transparent !important;
  font-weight: 500 !important;
  text-decoration-line: underline !important;
  text-decoration-color: var(--sales-foreground) !important;
  text-decoration-thickness: 2px !important;
  text-underline-offset: 16px !important;
}
.sales-page .sales-kanban {
  width: 100% !important;
  max-width: 100% !important;
  display: flex !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scrollbar-width: thin;
  scrollbar-color: var(--sales-border) transparent;
}
.sales-page .sales-kanban > section {
  flex: 0 0 220px !important;
}
.sales-page .sales-workflow-strip,
.sales-page .sales-kpi-grid,
.sales-page .sales-tabs,
.sales-page .sales-tab-content {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}
.sales-page .sales-workflow-step {
  flex: 0 0 228px !important;
  width: 228px !important;
  max-width: 228px !important;
}
.sales-page .sales-panel-search {
  flex: 0 0 280px !important;
  width: 280px !important;
  max-width: min(280px, 42vw) !important;
  margin-left: auto !important;
}
.sales-page .sales-panel-search input {
  width: 100% !important;
}
body .app-shell .main-content:has(> .sales-page),
body .app-shell .main-content > .sales-page {
  background: #f3f4f6 !important;
}
body .app-shell .main-content:has(> .sales-page) {
  padding: 0 !important;
}
html[data-theme] body .app-shell .app-main .main-content > .sales-page,
body .app-shell .app-main .main-content > .sales-page,
body .app-shell .main-content > .sales-page {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.sales-page {
  --sales-dashboard-inline-space: clamp(48px, 10.5vw, 176px);
  --sales-dashboard-max-width: 1640px;
}
.sales-page .sales-dashboard-hero {
  width: 100%;
  margin: 0;
  padding: 34px 0 64px;
  background: linear-gradient(180deg, #d5f6e5 0%, #d5f6e5 46%, #f3f4f6 100%);
  color: #0f172a;
}
.sales-page .sales-dashboard-inner,
.sales-page .sales-dashboard-content {
  width: min(var(--sales-dashboard-max-width), calc(100% - var(--sales-dashboard-inline-space)));
  margin-inline: auto;
}
.sales-page .sales-dashboard-inner {
  display: grid;
  gap: 18px;
}
.sales-page .sales-dashboard-content {
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 0 0 32px;
}
html[data-theme] .sales-page .sales-dashboard-hero .sales-page-header,
html[data-theme] .sales-page .sales-dashboard-hero .sales-header-actions,
.sales-page .sales-dashboard-hero .sales-page-header,
.sales-page .sales-dashboard-hero .sales-header-actions {
  background: transparent !important;
  background-color: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
.sales-page .sales-dashboard-hero h1,
.sales-page .sales-dashboard-hero p,
.sales-page .sales-dashboard-hero .sales-breadcrumb {
  color: #0f172a !important;
}
.sales-page .sales-dashboard-hero p {
  opacity: .94;
}
.sales-page .sales-header-actions > button,
.sales-page .sales-header-actions > div > button {
  min-height: 40px;
  height: 40px;
  border-radius: 6px !important;
  box-shadow: none !important;
}
.sales-page .sales-header-actions > div > button,
.sales-page .sales-header-actions > button:not(:first-of-type) {
  background: rgba(255,255,255,.76) !important;
  border-color: rgba(255,255,255,.92) !important;
  color: #0f172a !important;
}
.sales-page .sales-header-actions > button:first-of-type {
  background: #22c55e !important;
  border-color: #22c55e !important;
  color: #ffffff !important;
}
.sales-page .sales-header-actions > button:hover,
.sales-page .sales-header-actions > div > button:hover {
  background: #ffffff !important;
  border-color: #ffffff !important;
  color: #0f172a !important;
}
.sales-page .sales-kpi-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.sales-page .sales-dashboard-hero .sales-metric-card {
  position: relative;
  min-width: 0;
  min-height: 112px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 15px 16px;
  border: 1px solid rgba(255,255,255,.92) !important;
  border-radius: 6px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.94), rgba(255,255,255,.62) 48%, rgba(255,255,255,.86)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,1),
    inset 0 -1px 0 rgba(255,255,255,.46),
    0 18px 42px rgba(15,23,42,.08) !important;
  backdrop-filter: blur(20px) saturate(190%);
  -webkit-backdrop-filter: blur(20px) saturate(190%);
}
.sales-page .sales-dashboard-hero .sales-metric-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(115deg, rgba(255,255,255,.92) 0%, rgba(255,255,255,.28) 34%, transparent 60%),
    radial-gradient(circle at 12% 0%, rgba(255,255,255,.78), transparent 38%);
  opacity: .88;
}
.sales-page .sales-dashboard-hero .sales-metric-card > * {
  position: relative;
  z-index: 1;
}
.sales-page .sales-metric-card > span:last-child {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.sales-page .sales-dashboard-hero .sales-metric-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,.92);
  border-radius: 6px;
  background: rgba(255,255,255,.62) !important;
  color: var(--sales-metric-color, #0f172a) !important;
}
.sales-page .sales-dashboard-hero .sales-stat-label,
.sales-page .sales-dashboard-hero .sales-stat-value,
.sales-page .sales-dashboard-hero .sales-stat-detail {
  overflow: hidden;
  color: #0f172a !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sales-page .sales-dashboard-hero .sales-stat-label,
.sales-page .sales-dashboard-hero .sales-stat-detail {
  font-size: 12px;
  font-weight: 600;
  opacity: .72;
}
.sales-page .sales-dashboard-hero .sales-stat-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
}
.sales-page .sales-filter-panel,
.sales-page .sales-notice,
.sales-page .sales-panel {
  box-shadow: 0 1px 2px rgba(15,23,42,.04) !important;
}
.sales-page .sales-panel {
  border-color: #dbe2ea !important;
  border-radius: 8px !important;
  background: #ffffff !important;
}
.sales-page .sales-panel-header,
.sales-page .sales-opportunity-tabs,
.sales-page .sales-opportunity-toolbar {
  background: #ffffff !important;
}
.sales-page .sales-opportunity-tabs {
  border-bottom-color: #e5e7eb !important;
}
.sales-page .sales-opportunity-tabs button.is-active {
  color: #0f172a !important;
}
.sales-page table th {
  background: #f8fafc !important;
  color: #475569 !important;
  font-size: 12px !important;
}
.sales-page table td {
  background: #ffffff !important;
}
.sales-page tbody tr:hover td {
  background: #f8fafc !important;
}
@media (max-width: 1024px) {
  .sales-page {
    --sales-dashboard-inline-space: 32px;
  }
  .sales-page .sales-dashboard-hero {
    padding: 26px 0 54px;
  }
  .sales-page .sales-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .sales-page {
    --sales-dashboard-inline-space: 24px;
  }
  .sales-page .sales-dashboard-hero {
    padding: 22px 0 46px;
  }
  .sales-page .sales-page-header {
    display: grid !important;
  }
  .sales-page .sales-header-actions {
    width: 100%;
    display: grid !important;
    grid-template-columns: 1fr;
  }
  .sales-page .sales-header-actions > button,
  .sales-page .sales-header-actions > div,
  .sales-page .sales-header-actions > div > button {
    width: 100%;
  }
  .sales-page .sales-kpi-grid {
    display: flex !important;
    overflow-x: auto !important;
    padding-bottom: 4px !important;
    scroll-snap-type: x mandatory;
  }
  .sales-page .sales-dashboard-hero .sales-metric-card {
    min-width: min(280px, 82vw);
    scroll-snap-align: start;
  }
  .sales-page .sales-panel-search {
    flex-basis: 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
  }
  .sales-page [style*="grid-template-columns: repeat(6"] {
    grid-template-columns: repeat(6, minmax(180px, 1fr)) !important;
  }
}
`

const salesPage: CSSProperties = {
  fontFamily: font,
  display: 'block',
  color: 'var(--sales-foreground)',
  background: '#f3f4f6',
  minHeight: 'calc(100dvh - 56px)',
  width: '100%',
  padding: 0,
  maxWidth: 'none',
  margin: 0,
  overflowX: 'hidden',
  boxSizing: 'border-box',
}
const pageHeader: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sales-space-4)', flexWrap: 'wrap', minWidth: 0 }
const breadcrumb: CSSProperties = { fontSize: 14, color: 'var(--sales-muted)', fontWeight: 500, marginBottom: 22 }
const h1: CSSProperties = { margin: 0, fontSize: 31, lineHeight: '37px', fontWeight: 600, color: 'var(--sales-foreground)', letterSpacing: 0 }
const subtitleStyle: CSSProperties = { margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--sales-muted)', fontWeight: 400, maxWidth: 760 }
const actionsWrap: CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--sales-space-3)', flexWrap: 'wrap' }
const primaryButton: CSSProperties = { height: 42, border: '1px solid var(--sales-primary)', background: 'var(--sales-primary)', color: 'var(--sales-primary-foreground)', borderRadius: 'var(--sales-radius-sm)', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 14, fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }
const secondaryButton: CSSProperties = { height: 40, border: '1px solid var(--sales-border)', background: 'var(--sales-card)', color: 'var(--sales-foreground)', borderRadius: 'var(--sales-radius-sm)', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 14, fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }
const periodMenu: CSSProperties = { position: 'absolute', right: 0, top: 46, zIndex: 30, width: 190, background: 'var(--sales-card)', border: '1px solid var(--sales-border)', borderRadius: 'var(--sales-radius-sm)', padding: 6 }
const menuOption = (active: boolean): CSSProperties => ({ width: '100%', border: 0, background: active ? 'var(--sales-card-hover)' : 'transparent', color: active ? 'var(--sales-foreground)' : 'var(--sales-muted)', borderRadius: 8, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' })
const filterPanel: CSSProperties = { border: '1px solid var(--sales-border)', borderRadius: 'var(--sales-radius)', background: 'var(--sales-card)', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sales-space-4)' }
const panel: CSSProperties = { width: '100%', maxWidth: '100%', background: 'var(--sales-card)', border: '1px solid var(--sales-border)', borderRadius: 'var(--sales-radius)', overflow: 'hidden', minWidth: 0, boxSizing: 'border-box', contain: 'inline-size' }
const panelHeader: CSSProperties = { minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 18px', borderBottom: '1px solid var(--sales-border-soft)', minWidth: 0, overflow: 'hidden' }
const panelTitle: CSSProperties = { margin: 0, color: 'var(--sales-foreground)', fontSize: 14, fontWeight: 600 }
const emptyState: CSSProperties = { minHeight: 154, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 6, padding: 24, color: 'var(--sales-muted)', textAlign: 'center', fontSize: 13 }
const opportunityTabs: CSSProperties = { display: 'flex', gap: 22, padding: '0 16px', minHeight: 48, alignItems: 'flex-end', borderBottom: '1px solid var(--sales-border-soft)', overflowX: 'auto' }
const opportunityTabStyle = (active: boolean): CSSProperties => ({ height: 48, border: 0, borderBottom: `2px solid ${active ? 'var(--sales-foreground)' : 'transparent'}`, background: 'transparent', color: active ? 'var(--sales-foreground)' : 'var(--sales-muted)', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 0 13px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' })
const opportunityToolbar: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderBottom: '1px solid var(--sales-border-soft)', flexWrap: 'wrap' }
const opportunityClientFilter: CSSProperties = { height: 44, width: 200, border: '1px solid var(--sales-input-border)', borderRadius: 'var(--sales-radius-sm)', background: 'var(--sales-input)', color: 'var(--sales-foreground)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }
const opportunitySelect: CSSProperties = { minWidth: 0, flex: 1, border: 0, outline: 0, background: 'transparent', color: 'var(--sales-foreground)', fontSize: 14 }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 1040 }
const thStyle: CSSProperties = { padding: '13px 14px', color: 'var(--sales-muted)', background: 'var(--sales-card)', fontSize: 13, fontWeight: 500, textAlign: 'left', whiteSpace: 'nowrap' }
const tdStyle: CSSProperties = { padding: '13px 14px', borderTop: '1px solid var(--sales-border-soft)', color: 'var(--sales-foreground)', fontSize: 13, fontWeight: 400, whiteSpace: 'nowrap', verticalAlign: 'top' }
const searchBox: CSSProperties = { height: 40, width: 280, maxWidth: '100%', flex: '0 0 280px', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', border: '1px solid var(--sales-input-border)', borderRadius: 'var(--sales-radius-sm)', background: 'var(--sales-input)' }
const bareInput: CSSProperties = { border: 0, outline: 0, minWidth: 0, flex: 1, fontSize: 14, background: 'transparent', color: 'var(--sales-foreground)' }
const smallButton: CSSProperties = { minHeight: 30, border: '1px solid var(--sales-border)', background: 'var(--sales-card)', color: 'var(--sales-foreground)', borderRadius: 7, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer' }
const iconButton: CSSProperties = { width: 34, height: 34, border: '1px solid var(--sales-border)', borderRadius: 8, background: 'var(--sales-card)', color: 'var(--sales-foreground)', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const successBox: CSSProperties = { border: '1px solid color-mix(in srgb, var(--sales-success) 35%, var(--sales-border))', background: 'color-mix(in srgb, var(--sales-success) 10%, transparent)', color: 'var(--sales-success)', borderRadius: 'var(--sales-radius-sm)', padding: '12px 14px', fontSize: 13, fontWeight: 500, display: 'flex', justifyContent: 'space-between', gap: 12 }
const dismissButton: CSSProperties = { border: 0, background: 'transparent', color: 'var(--sales-success)', cursor: 'pointer', display: 'grid', placeItems: 'center' }
const overlay: CSSProperties = { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,.58)', display: 'flex', justifyContent: 'flex-end' }
const drawer: CSSProperties = { width: 'min(520px, 100vw)', height: '100%', background: 'var(--sales-background)', color: 'var(--sales-foreground)', borderLeft: '1px solid var(--sales-border)', display: 'grid', gridTemplateRows: 'auto 1fr auto', overflowY: 'auto' }
const drawerHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, padding: 28, borderBottom: '1px solid var(--sales-border)' }
const formGrid: CSSProperties = { display: 'grid', gap: 16, padding: 28 }
const fieldWrap: CSSProperties = { display: 'grid', gap: 8, minWidth: 0 }
const clientPreview: CSSProperties = { border: '1px solid var(--sales-border)', background: 'var(--sales-card)', borderRadius: 'var(--sales-radius-sm)', padding: 12, display: 'grid', gap: 5, color: 'var(--sales-muted)', fontSize: 12, fontWeight: 400 }
const fieldHint: CSSProperties = { margin: 0, color: 'var(--sales-muted)', fontSize: 12, lineHeight: 1.45 }
const labelStyle: CSSProperties = { color: 'var(--sales-muted)', fontSize: 13, fontWeight: 500 }
const inputStyle: CSSProperties = { width: '100%', height: 48, border: '1px solid var(--sales-input-border)', borderRadius: 'var(--sales-radius-sm)', padding: '0 12px', color: 'var(--sales-foreground)', fontSize: 14, fontWeight: 400, outline: 'none', background: 'var(--sales-input)', boxSizing: 'border-box' }
const prefixStyle: CSSProperties = { position: 'absolute', left: 12, top: 15, color: 'var(--sales-muted)', fontSize: 13, fontWeight: 500 }
const drawerFooter: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 28, borderTop: '1px solid var(--sales-border)' }
