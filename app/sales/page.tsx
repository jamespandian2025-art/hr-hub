'use client'

import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Funnel,
  Hammer,
  HardHat,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  PencilRuler,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react'
import { type CompanyRecord, companyChangeEvent, companyScopedKey, getActiveCompany, getCurrentActor } from '@/lib/tenant/company'

type LeadStatus = 'New Inquiry' | 'Contacted' | 'Consultation Scheduled' | 'Qualified' | 'Lost'
type OpportunityStage = 'Consultation' | 'Site Inspection' | 'Proposal Preparation' | 'Submitted Proposal' | 'Negotiation' | 'Contract Review' | 'Won' | 'Lost'
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
  projectType: string
  estimatedContractValue: number
  projectSize: string
  probability: number
  stage: OpportunityStage
  expectedCloseDate: string
  assignedTeam: string
  salesRep: string
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
  client: string
  projectName: string
  amount: string
  projectType: string
  location: string
  salesRep: string
  closeDate: string
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
const green = '#16a34a'
const salesWorkspaceKey = 'wiseflow-sales-workspace'
const tabs = ['Overview', 'Leads', 'Opportunities', 'Site Visits', 'Proposals & Quotations', 'Contracts', 'Progress Billing', 'Clients', 'Sales Analytics']
const workflowSteps = ['Lead', 'Consultation', 'Site Visit', 'Proposal / BOQ', 'Quotation', 'Negotiation', 'Contract Signing', 'Project Awarded', 'Progress Billing', 'Project Handover']
const opportunityStages: OpportunityStage[] = ['Consultation', 'Site Inspection', 'Proposal Preparation', 'Submitted Proposal', 'Negotiation', 'Contract Review', 'Won', 'Lost']
const projectTypes = ['Residential', 'Commercial', 'Renovation', 'Interior Design', 'Office Fit-Out', 'Resort', 'Warehouse', 'Structural']
const leadSources = ['Facebook', 'Website', 'Referral', 'Walk-in', 'LinkedIn', 'Advertisement']

const emptyForm: SalesForm = {
  client: '',
  projectName: '',
  amount: '',
  projectType: 'Residential',
  location: '',
  salesRep: '',
  closeDate: new Date().toISOString().slice(0, 10),
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

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [query, setQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
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

  const proposalValue = proposals.reduce((sum, proposal) => sum + proposal.total, 0)
  const activeOpportunityCount = opportunities.filter(item => !['Won', 'Lost'].includes(item.stage)).length
  const wonProjects = opportunities.filter(item => item.stage === 'Won').length
  const conversion = Math.round((wonProjects / Math.max(opportunities.length, 1)) * 1000) / 10
  const forecast = opportunities.filter(item => !['Won', 'Lost'].includes(item.stage)).reduce((sum, item) => sum + item.estimatedContractValue * (item.probability / 100), 0)
  const pendingProposalCount = proposals.filter(item => ['Draft', 'Submitted', 'Under Review', 'Revision Requested'].includes(item.status)).length
  const signedContracts = contracts.filter(item => ['Active', 'Completed'].includes(item.status)).length
  const filtered = useMemo(() => filterRows({ leads, opportunities, siteVisits, proposals, contracts, billings, clients }, query), [billings, clients, contracts, leads, opportunities, proposals, query, siteVisits])
  const repTotals = useMemo(() => totalBy(opportunities, item => item.salesRep, item => item.estimatedContractValue), [opportunities])
  const categoryTotals = useMemo(() => totalBy(opportunities, item => item.projectType, item => item.estimatedContractValue), [opportunities])
  const pipeline = useMemo(() => buildPipeline(opportunities), [opportunities])
  const salesRepOptions = useMemo(() => getSalesRepOptions(activeCompany), [activeCompany])

  const createQuickOpportunity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(form.amount)
    if (!form.client.trim() || !form.projectName.trim() || !Number.isFinite(value) || value <= 0) {
      setNotice('Complete client, project name, and estimated contract value before creating an opportunity.')
      return
    }

    const rep = form.salesRep.trim() || salesRepOptions[0] || 'Unassigned'
    const next: Opportunity = {
      id: nextCode('OP', opportunities.map(item => item.id)),
      companyId: activeCompany?.id,
      name: form.projectName.trim(),
      client: form.client.trim(),
      projectType: form.projectType,
      estimatedContractValue: value,
      projectSize: form.location.trim() || 'To be assessed',
      probability: 35,
      stage: 'Consultation',
      expectedCloseDate: form.closeDate,
      assignedTeam: 'Architecture / Engineering',
      salesRep: rep,
    }
    setOpportunities(current => [next, ...current])
    ensureClient(form.client.trim(), rep, value)
    setForm({ ...emptyForm, salesRep: salesRepOptions[0] || '' })
    setDrawerOpen(false)
    setNotice('Project opportunity created in the acquisition pipeline.')
  }

  const qualifyLead = (lead: Lead) => {
    setLeads(current => current.map(item => item.id === lead.id ? { ...item, status: 'Qualified' } : item))
    setOpportunities(current => [{
      id: `OP-${lead.id.replace(/\D/g, '').padStart(4, '0')}`,
      companyId: activeCompany?.id,
      name: `${lead.projectType} project for ${lead.companyName}`,
      client: lead.companyName,
      projectType: lead.projectType,
      estimatedContractValue: lead.estimatedBudget,
      projectSize: lead.location,
      probability: 30,
      stage: 'Consultation',
      expectedCloseDate: new Date().toISOString().slice(0, 10),
      assignedTeam: 'Pre-construction',
      salesRep: lead.salesRep,
    }, ...current])
    ensureClient(lead.companyName, lead.salesRep, lead.estimatedBudget, lead.email, lead.phone, lead.location)
    setNotice(`${lead.companyName} moved to the construction opportunity pipeline.`)
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
    setOpportunities(current => current.map(item => item.id === opportunity.id ? { ...item, stage: 'Site Inspection', probability: Math.max(item.probability, 45) } : item))
    setNotice(`${visit.id} scheduled for ${opportunity.client}.`)
  }

  const sendProposal = (proposal: Proposal) => {
    setProposals(current => current.map(item => item.id === proposal.id ? { ...item, status: 'Submitted' } : item))
    setNotice(`${proposal.id} marked as submitted to ${proposal.client}.`)
  }

  const convertProposal = (proposal: Proposal) => {
    const id = proposal.id.replace('PROP', 'CON')
    if (contracts.some(contract => contract.id === id)) {
      setNotice(`${id} already exists.`)
      return
    }
    const contract: Contract = {
      id,
      companyId: activeCompany?.id,
      client: proposal.client,
      projectName: proposal.projectName,
      contractAmount: proposal.total,
      downpayment: proposal.total * 0.2,
      retention: proposal.total * 0.1,
      startDate: new Date().toISOString().slice(0, 10),
      completionDate: proposal.validUntil,
      status: 'Pending Signature',
      milestoneTracking: proposal.timeline,
    }
    setProposals(current => current.map(item => item.id === proposal.id ? { ...item, status: 'Approved' } : item))
    setContracts(current => [contract, ...current])
    setOpportunities(current => current.map(item => item.client === proposal.client && item.name === proposal.projectName ? { ...item, stage: 'Contract Review', probability: Math.max(item.probability, 80) } : item))
    ensureClient(proposal.client, 'Account Manager', proposal.total)
    setNotice(`${proposal.id} converted to ${contract.id}.`)
  }

  const activateContract = (contract: Contract) => {
    setContracts(current => current.map(item => item.id === contract.id ? { ...item, status: 'Active' } : item))
    setOpportunities(current => current.map(item => item.client === contract.client && item.name === contract.projectName ? { ...item, stage: 'Won', probability: 100 } : item))
    setBillings(current => current.some(item => item.project === contract.projectName) ? current : [
      ...billingSchedule(contract, activeCompany?.id),
      ...current,
    ])
    setNotice(`${contract.id} activated. Progress billing schedule created for Financials.`)
  }

  const markBillingPaid = (billing: ProgressBilling) => {
    setBillings(current => current.map(item => item.id === billing.id ? { ...item, paidAmount: item.amount, remainingBalance: 0, status: 'Paid' } : item))
    setNotice(`${billing.id} marked paid and synced to cash flow.`)
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

  return (
    <div className="sales-page" style={{ fontFamily: font, display: 'grid', gap: 22, color: '#0f172a' }}>
      <PageHeader
        title="CRM & Sales"
        subtitle={`Construction CRM, proposal management, project acquisition, contracts, and progress billing for ${activeCompany?.name || 'the selected company'}.`}
        actions={(
          <>
            <ToolbarButton icon={<CalendarDays size={16} />} label="Current period" hasChevron />
            <ToolbarButton icon={<Filter size={16} />} label="Filters" />
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNewMenuOpen(value => !value)} style={primaryButton}><Plus size={16} /> New <ChevronDown size={14} /></button>
              {newMenuOpen ? (
                <div style={newMenu}>
                  <button onClick={() => { setActiveTab('Leads'); setNewMenuOpen(false); setNotice(`Lead capture is ready for ${leadSources.slice(0, 3).join(', ')}, and other construction inquiry sources.`) }} style={newMenuItem}><UsersRound size={15} /> New lead</button>
                  <button onClick={() => { setDrawerOpen(true); setForm({ ...emptyForm, salesRep: salesRepOptions[0] || '' }); setNewMenuOpen(false) }} style={newMenuItem}><HardHat size={15} /> New opportunity</button>
                  <button onClick={() => { setActiveTab('Proposals & Quotations'); setNewMenuOpen(false); setNotice('Proposal builder is ready for BOQ, scope, and costing workflows.') }} style={newMenuItem}><PencilRuler size={15} /> New proposal</button>
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
        <MetricCard icon={<FileText size={23} />} label="Total Proposal Value" value={money(proposalValue)} detail={`${pendingProposalCount} pending proposals`} tone="#16a34a" />
        <MetricCard icon={<Funnel size={23} />} label="Active Opportunities" value={String(activeOpportunityCount)} detail={`${money(forecast)} forecast pipeline`} tone="#2563eb" />
        <MetricCard icon={<ShieldCheck size={23} />} label="Projects Won" value={String(wonProjects)} detail={`${conversion}% conversion rate`} tone="#7c3aed" />
        <MetricCard icon={<MapPin size={23} />} label="Site Visits Scheduled" value={String(siteVisits.filter(item => item.status === 'Scheduled').length)} detail={`${siteVisits.filter(item => item.status === 'Completed').length} completed visits`} tone="#f59e0b" />
        <MetricCard icon={<FileCheck2 size={23} />} label="Contracts Signed" value={String(signedContracts)} detail={`${money(contracts.reduce((sum, item) => sum + item.contractAmount, 0))} contract value`} tone="#14b8a6" />
      </div>

      <div className="sales-tabs" style={tabsStyle}>
        {tabs.map(tab => <button key={tab} className={activeTab === tab ? 'is-active' : undefined} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>{tab}</button>)}
      </div>

      {activeTab === 'Overview' ? (
        <Overview
          opportunities={opportunities}
          siteVisits={siteVisits}
          proposals={proposals}
          contracts={contracts}
          billings={billings}
          clients={clients}
          reps={repTotals}
          categories={categoryTotals}
          pipeline={pipeline}
          onScheduleVisit={scheduleSiteVisit}
          onConvertProposal={convertProposal}
          onActivateContract={activateContract}
        />
      ) : (
        <Panel title={activeTab} action={<SearchFilter search={query} setSearch={setQuery} />}>
          {activeTab === 'Leads' && <LeadsTab leads={filtered.leads} onQualify={qualifyLead} />}
          {activeTab === 'Opportunities' && <OpportunitiesTab opportunities={filtered.opportunities} onScheduleVisit={scheduleSiteVisit} />}
          {activeTab === 'Site Visits' && <SiteVisitsTab visits={filtered.siteVisits} />}
          {activeTab === 'Proposals & Quotations' && <ProposalsTab proposals={filtered.proposals} onSend={sendProposal} onConvert={convertProposal} />}
          {activeTab === 'Contracts' && <ContractsTab contracts={filtered.contracts} onActivate={activateContract} />}
          {activeTab === 'Progress Billing' && <ProgressBillingTab billings={filtered.billings} onMarkPaid={markBillingPaid} />}
          {activeTab === 'Clients' && <ClientsTab clients={filtered.clients} />}
          {activeTab === 'Sales Analytics' && <AnalyticsTab opportunities={opportunities} proposals={proposals} contracts={contracts} billings={billings} clients={clients} />}
        </Panel>
      )}

      <IntegrationRail />

      {drawerOpen ? (
        <div style={overlay}>
          <form onSubmit={createQuickOpportunity} style={drawer}>
            <div style={drawerHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Create Project Opportunity</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>Start a construction acquisition record from consultation to proposal and contract award.</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} style={iconButton}><X size={18} /></button>
            </div>
            <div style={formGrid}>
              <TextField label="Client / Company" value={form.client} onChange={value => setForm(current => ({ ...current, client: value }))} required />
              <TextField label="Project Name" value={form.projectName} onChange={value => setForm(current => ({ ...current, projectName: value }))} required />
              <TextField label="Estimated Contract Value" value={form.amount} onChange={value => setForm(current => ({ ...current, amount: value }))} type="number" prefix="$" required />
              <SelectField label="Project Type" value={form.projectType} onChange={value => setForm(current => ({ ...current, projectType: value }))} options={projectTypes} />
              <TextField label="Location / Site Address" value={form.location} onChange={value => setForm(current => ({ ...current, location: value }))} />
              <SelectField label="Sales Rep" value={form.salesRep} onChange={value => setForm(current => ({ ...current, salesRep: value }))} options={salesRepOptions} />
              <TextField label="Expected Closing Date" value={form.closeDate} onChange={value => setForm(current => ({ ...current, closeDate: value }))} type="date" />
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

function Overview({ opportunities, siteVisits, proposals, contracts, billings, clients, reps, categories, pipeline, onScheduleVisit, onConvertProposal, onActivateContract }: {
  opportunities: Opportunity[]
  siteVisits: SiteVisit[]
  proposals: Proposal[]
  contracts: Contract[]
  billings: ProgressBilling[]
  clients: Client[]
  reps: { label: string; amount: number; count: number }[]
  categories: { label: string; amount: number; count: number }[]
  pipeline: { stage: OpportunityStage; count: number; amount: number }[]
  onScheduleVisit: (opportunity: Opportunity) => void
  onConvertProposal: (proposal: Proposal) => void
  onActivateContract: (contract: Contract) => void
}) {
  return (
    <>
      <div className="sales-top-grid" style={topGrid}>
        <Panel title="Proposal Pipeline" action={<select style={miniSelect}><option>This Quarter</option></select>}>
          {pipeline.some(stage => stage.count > 0) ? <Pipeline stages={pipeline} /> : <EmptyState title="No proposal pipeline yet" body="Qualified project opportunities will appear in the construction acquisition funnel." />}
        </Panel>
        <Panel title="Revenue Forecast" action={<select style={miniSelect}><option>By Month</option></select>}>
          {opportunities.length ? <ForecastChart opportunities={opportunities} /> : <EmptyState title="No forecast yet" body="Estimated contract values will build the revenue forecast." />}
        </Panel>
        <Panel title="Top Project Categories" action={<a style={viewAll}>View All</a>}>
          {categories.length ? <CategoryRevenue categories={categories} /> : <EmptyState title="No category data yet" body="Project types will rank after opportunities are created." />}
        </Panel>
      </div>
      <div className="sales-bottom-grid" style={bottomGrid}>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Panel title="Recent Opportunities" action={<a style={viewAll}>View All</a>}>
            <OpportunitiesTab opportunities={opportunities.slice(0, 5)} onScheduleVisit={onScheduleVisit} compact />
          </Panel>
          <Panel title="Pending Quotations" action={<a style={viewAll}>View All</a>}>
            <ProposalsTab proposals={proposals.filter(item => item.status !== 'Approved').slice(0, 4)} onSend={() => undefined} onConvert={onConvertProposal} compact />
          </Panel>
        </div>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Panel title="Upcoming Site Visits" action={<a style={viewAll}>View All</a>}>
            <SiteVisitsTab visits={siteVisits.slice(0, 4)} compact />
          </Panel>
          <Panel title="Recent Contracts" action={<a style={viewAll}>View All</a>}>
            <ContractsTab contracts={contracts.slice(0, 4)} onActivate={onActivateContract} compact />
          </Panel>
          <Panel title="Top Clients" action={<a style={viewAll}>View All</a>}>
            {clients.length ? <div style={{ display: 'grid', gap: 12, padding: 16 }}>{clients.slice(0, 5).map(client => <MiniRow key={client.id} title={client.companyName} sub={client.contactPerson} value={money(client.totalContractValue)} />)}</div> : <EmptyState title="No client history yet" body="Clients are created from qualified leads, proposals, and contracts." />}
          </Panel>
        </div>
      </div>
      <div className="sales-top-grid" style={topGrid}>
        <Panel title="Won vs Lost Projects"><WinLossChart opportunities={opportunities} /></Panel>
        <Panel title="Lead Sources"><InsightList title="Lead Source Analysis" items={totalBy(opportunities, item => item.projectType, item => item.estimatedContractValue).map(item => [item.label, money(item.amount)])} /></Panel>
        <Panel title="Proposal Conversion Rate"><ConversionSummary opportunities={opportunities} proposals={proposals} contracts={contracts} billings={billings} reps={reps} /></Panel>
      </div>
    </>
  )
}

function WorkflowStrip() {
  return (
    <div className="sales-workflow-strip" style={workflowStrip}>
      {workflowSteps.map((step, index) => (
        <div key={step} className="sales-workflow-step" style={workflowStep}>
          <span style={workflowNumber}>{index + 1}</span>
          <span>{step}</span>
        </div>
      ))}
    </div>
  )
}

function LeadsTab({ leads, onQualify }: { leads: Lead[]; onQualify: (lead: Lead) => void }) {
  if (!leads.length) return <EmptyState title="No construction leads yet" body="Capture inquiries from Facebook, website, referrals, walk-ins, LinkedIn, or advertisements." />
  return <DataTable headers={['Lead Name', 'Company', 'Contact', 'Email', 'Phone', 'Project Type', 'Estimated Budget', 'Location', 'Source', 'Assigned Rep', 'Status', 'Created', 'Actions']}>
    {leads.map(lead => <tr key={lead.id}>
      <Cell strong>{lead.leadName}</Cell><Cell>{lead.companyName}</Cell><Cell>{lead.contactPerson}</Cell><Cell>{lead.email}</Cell><Cell>{lead.phone}</Cell><Cell>{lead.projectType}</Cell><Cell>{money(lead.estimatedBudget)}</Cell><Cell>{lead.location}</Cell><Cell>{lead.source}</Cell><Cell>{lead.salesRep}</Cell><Cell><Badge text={lead.status} /></Cell><Cell>{date(lead.createdDate)}</Cell>
      <Cell>{lead.status !== 'Qualified' && lead.status !== 'Lost' ? <button onClick={() => onQualify(lead)} style={smallButton}>Qualify</button> : <button style={iconButton}><MoreHorizontal size={15} /></button>}</Cell>
    </tr>)}
  </DataTable>
}

function OpportunitiesTab({ opportunities, onScheduleVisit, compact }: { opportunities: Opportunity[]; onScheduleVisit: (opportunity: Opportunity) => void; compact?: boolean }) {
  const [view, setView] = useState<'grid' | 'table'>('grid')
  if (!opportunities.length) return <EmptyState title="No project opportunities yet" body="Create qualified project opportunities from consultations or inquiries." />
  if (!compact && view === 'grid') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 14px 0' }}><ViewToggle value={view} onChange={setView} /></div>
        <Kanban opportunities={opportunities} onScheduleVisit={onScheduleVisit} />
      </div>
    )
  }
  return <DataTable headers={compact ? ['Opportunity', 'Client', 'Value', 'Stage', 'Actions'] : ['Opportunity', 'Client', 'Project Type', 'Est. Contract Value', 'Project Size', 'Probability', 'Current Stage', 'Expected Close', 'Assigned Team', 'Sales Rep', 'Actions']}>
    {opportunities.map(item => <tr key={item.id}>
      <Cell strong>{item.name}</Cell><Cell>{item.client}</Cell>{!compact && <Cell>{item.projectType}</Cell>}<Cell>{money(item.estimatedContractValue)}</Cell>{!compact && <Cell>{item.projectSize}</Cell>}{!compact && <Cell>{item.probability}%</Cell>}<Cell><Badge text={item.stage} /></Cell>{!compact && <Cell>{date(item.expectedCloseDate)}</Cell>}{!compact && <Cell>{item.assignedTeam}</Cell>}{!compact && <Cell>{item.salesRep}</Cell>}
      <Cell><ActionGroup actions={[['Site Visit', () => onScheduleVisit(item), MapPin]]} /></Cell>
    </tr>)}
  </DataTable>
}

function Kanban({ opportunities, onScheduleVisit }: { opportunities: Opportunity[]; onScheduleVisit: (opportunity: Opportunity) => void }) {
  return <div className="sales-kanban" style={kanbanGrid}>{opportunityStages.map(stage => {
    const rows = opportunities.filter(item => item.stage === stage)
    return <section key={stage} style={kanbanColumn}>
      <header style={kanbanHeader}><span>{stage}</span><b>{rows.length}</b></header>
      {rows.length ? rows.map(item => <article key={item.id} style={kanbanCard}>
        <strong>{item.name}</strong>
        <span>{item.client}</span>
        <b>{money(item.estimatedContractValue)}</b>
        <small>{item.projectType} • {item.probability}%</small>
        {!['Won', 'Lost'].includes(item.stage) ? <button onClick={() => onScheduleVisit(item)} style={smallButton}><MapPin size={13} /> Site Visit</button> : null}
      </article>) : <p style={kanbanEmpty}>No projects</p>}
    </section>
  })}</div>
}

function SiteVisitsTab({ visits, compact }: { visits: SiteVisit[]; compact?: boolean }) {
  if (!visits.length) return <EmptyState title="No site visits scheduled" body="Schedule inspections and consultations with assigned architects or engineers." />
  return <DataTable headers={compact ? ['Client', 'Project', 'Schedule', 'Status'] : ['Client', 'Project', 'Site Address', 'Assigned Architect/Engineer', 'Schedule', 'Visit Status', 'Notes', 'Measurements', 'Checklist']}>
    {visits.map(visit => <tr key={visit.id}>
      <Cell strong>{visit.client}</Cell><Cell>{visit.project}</Cell>{!compact && <Cell>{visit.siteAddress}</Cell>}{!compact && <Cell>{visit.assignedProfessional}</Cell>}<Cell>{date(visit.schedule)}</Cell><Cell><Badge text={visit.status} /></Cell>{!compact && <Cell>{visit.notes}</Cell>}{!compact && <Cell>{visit.measurements}</Cell>}{!compact && <Cell>{visit.checklist}</Cell>}
    </tr>)}
  </DataTable>
}

function ProposalsTab({ proposals, onSend, onConvert, compact }: { proposals: Proposal[]; onSend: (proposal: Proposal) => void; onConvert: (proposal: Proposal) => void; compact?: boolean }) {
  if (!proposals.length) return <EmptyState title="No proposals or quotations yet" body="Build project proposals with scope of work, BOQ, labor, materials, equipment, design fees, VAT, and payment terms." />
  return <DataTable headers={compact ? ['Proposal #', 'Project', 'Total', 'Status', 'Actions'] : ['Proposal #', 'Client', 'Project', 'Scope of Work', 'BOQ', 'Labor', 'Materials', 'Equipment', 'Design Fees', 'VAT', 'Discount', 'Total', 'Timeline', 'Payment Terms', 'Valid Until', 'Status', 'Actions']}>
    {proposals.map(proposal => <tr key={proposal.id}>
      <Cell strong>{proposal.id}</Cell>{!compact && <Cell>{proposal.client}</Cell>}<Cell>{proposal.projectName}</Cell>{!compact && <Cell>{proposal.scopeOfWork}</Cell>}{!compact && <Cell>{proposal.boqSummary}</Cell>}{!compact && <Cell>{money(proposal.laborCost)}</Cell>}{!compact && <Cell>{money(proposal.materialCost)}</Cell>}{!compact && <Cell>{money(proposal.equipmentCost)}</Cell>}{!compact && <Cell>{money(proposal.designFees)}</Cell>}{!compact && <Cell>{money(proposal.vat)}</Cell>}{!compact && <Cell>{money(proposal.discount)}</Cell>}<Cell strong>{money(proposal.total)}</Cell>{!compact && <Cell>{proposal.timeline}</Cell>}{!compact && <Cell>{proposal.paymentTerms}</Cell>}{!compact && <Cell>{date(proposal.validUntil)}</Cell>}<Cell><Badge text={proposal.status} /></Cell>
      <Cell><ActionGroup actions={[['Send', () => onSend(proposal), Send], ['PDF', () => undefined, Download], ['Contract', () => onConvert(proposal), FileCheck2], ['BOQ', () => undefined, ClipboardList]]} /></Cell>
    </tr>)}
  </DataTable>
}

function ContractsTab({ contracts, onActivate, compact }: { contracts: Contract[]; onActivate: (contract: Contract) => void; compact?: boolean }) {
  if (!contracts.length) return <EmptyState title="No contracts yet" body="Approved proposals can be converted into contracts with signature, milestones, retention, and payment schedules." />
  return <DataTable headers={compact ? ['Contract #', 'Project', 'Amount', 'Status', 'Actions'] : ['Contract #', 'Client', 'Project Name', 'Contract Amount', 'Downpayment', 'Retention', 'Start Date', 'Completion Date', 'Contract Status', 'Milestone Tracking', 'Actions']}>
    {contracts.map(contract => <tr key={contract.id}>
      <Cell strong>{contract.id}</Cell>{!compact && <Cell>{contract.client}</Cell>}<Cell>{contract.projectName}</Cell><Cell strong>{money(contract.contractAmount)}</Cell>{!compact && <Cell>{money(contract.downpayment)}</Cell>}{!compact && <Cell>{money(contract.retention)}</Cell>}{!compact && <Cell>{date(contract.startDate)}</Cell>}{!compact && <Cell>{date(contract.completionDate)}</Cell>}<Cell><Badge text={contract.status} /></Cell>{!compact && <Cell>{contract.milestoneTracking}</Cell>}
      <Cell>{contract.status === 'Draft' || contract.status === 'Pending Signature' ? <ActionGroup actions={[['Activate', () => onActivate(contract), CheckCircle2], ['E-sign', () => undefined, FileCheck2]]} /> : <button style={iconButton}><MoreHorizontal size={15} /></button>}</Cell>
    </tr>)}
  </DataTable>
}

function ProgressBillingTab({ billings, onMarkPaid }: { billings: ProgressBilling[]; onMarkPaid: (billing: ProgressBilling) => void }) {
  if (!billings.length) return <EmptyState title="No progress billing yet" body="Active contracts generate milestone billing such as downpayment, structural completion, finishing, and turnover." />
  return <DataTable headers={['Billing #', 'Project', 'Billing Milestone', 'Amount', 'Due Date', 'Paid Amount', 'Remaining Balance', 'Payment Status', 'Actions']}>
    {billings.map(billing => <tr key={billing.id}>
      <Cell strong>{billing.id}</Cell><Cell>{billing.project}</Cell><Cell>{billing.milestone}</Cell><Cell strong>{money(billing.amount)}</Cell><Cell>{date(billing.dueDate)}</Cell><Cell>{money(billing.paidAmount)}</Cell><Cell>{money(billing.remainingBalance)}</Cell><Cell><Badge text={billing.status} /></Cell>
      <Cell>{billing.status !== 'Paid' ? <button onClick={() => onMarkPaid(billing)} style={smallButton}>Mark paid</button> : <button style={iconButton}><MoreHorizontal size={15} /></button>}</Cell>
    </tr>)}
  </DataTable>
}

function ClientsTab({ clients }: { clients: Client[] }) {
  if (!clients.length) return <EmptyState title="No construction clients yet" body="Client records collect communication history, proposal history, contracts, billings, and uploaded documents." />
  return <DataTable headers={['Company Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Active Projects', 'Total Contract Value', 'Last Interaction', 'Assigned Account Manager']}>
    {clients.map(client => <tr key={client.id}>
      <Cell strong>{client.companyName}</Cell><Cell>{client.contactPerson}</Cell><Cell>{client.email}</Cell><Cell>{client.phone}</Cell><Cell>{client.address}</Cell><Cell>{client.activeProjects}</Cell><Cell strong>{money(client.totalContractValue)}</Cell><Cell>{date(client.lastInteraction)}</Cell><Cell>{client.accountManager}</Cell>
    </tr>)}
  </DataTable>
}

function AnalyticsTab({ opportunities, proposals, contracts, billings, clients }: { opportunities: Opportunity[]; proposals: Proposal[]; contracts: Contract[]; billings: ProgressBilling[]; clients: Client[] }) {
  const won = opportunities.filter(item => item.stage === 'Won').length
  const avgProjectValue = contracts.reduce((sum, item) => sum + item.contractAmount, 0) / Math.max(contracts.length, 1)
  const proposalApproval = Math.round((proposals.filter(item => item.status === 'Approved').length / Math.max(proposals.length, 1)) * 100)
  const forecast = opportunities.filter(item => !['Won', 'Lost'].includes(item.stage)).reduce((sum, item) => sum + item.estimatedContractValue * (item.probability / 100), 0)
  const byType = totalBy(opportunities, item => item.projectType, item => item.estimatedContractValue)
  const byRep = totalBy(opportunities, item => item.salesRep, item => item.estimatedContractValue)
  const byClient = totalBy(clients, item => item.companyName, item => item.totalContractValue)
  return (
    <div style={analyticsGrid}>
      <InsightCard title="Average Project Value" value={money(avgProjectValue)} body="Average signed contract amount across active project wins." icon={Building2} />
      <InsightCard title="Average Closing Time" value="32 days" body="Estimated from consultation to contract award." icon={CalendarDays} />
      <InsightCard title="Proposal Approval Rate" value={`${proposalApproval}%`} body="Approved proposals against total proposal volume." icon={ClipboardCheck} />
      <InsightCard title="Total Pipeline Value" value={money(opportunities.reduce((sum, item) => sum + item.estimatedContractValue, 0))} body="Full construction acquisition pipeline." icon={Funnel} />
      <InsightCard title="Revenue Forecast" value={money(forecast)} body="Probability-weighted projected revenue." icon={BarChart3} />
      <InsightCard title="Win / Loss Ratio" value={`${won}:${opportunities.filter(item => item.stage === 'Lost').length}`} body="Won and lost project opportunities." icon={ShieldCheck} />
      <InsightList title="Revenue by Project Type" items={byType.map(item => [item.label, money(item.amount)])} />
      <InsightList title="Sales Rep Performance" items={byRep.map(item => [item.label, money(item.amount)])} />
      <InsightList title="Sales by Client" items={byClient.map(item => [item.label, money(item.amount)])} />
      <InsightCard title="Progress Billing Health" value={money(billings.reduce((sum, item) => sum + item.remainingBalance, 0))} body="Remaining balance from milestone billing schedules." icon={ReceiptText} />
    </div>
  )
}

function IntegrationRail() {
  const items = [
    ['Financials', 'Progress billing, invoices, cash flow, retention, and contract payments stay connected.'],
    ['Procurement', 'Approved BOQs can create purchase requests for materials and subcontractor packages.'],
    ['Warehouse', 'Project materials can reserve stock and update site delivery requirements.'],
    ['Project Management', 'Awarded contracts can create active construction projects automatically.'],
    ['HR', 'Assigned architects, engineers, estimators, and site teams connect to workload and performance.'],
    ['Documents', 'Proposals, drawings, BOQs, contracts, site photos, and handover files are attached per client.'],
    ['Workflows', 'Approvals can route proposals, discounts, contract reviews, and billing milestones.'],
  ]
  const icons = [ReceiptText, ClipboardList, Warehouse, Hammer, UserRound, FileText, CheckCircle2]
  return (
    <section style={integrationPanel}>
      <h2 style={panelTitle}>WiseFlow construction ERP integrations</h2>
      <div style={integrationGrid}>
        {items.map(([title, body], index) => {
          const Icon = icons[index]
          return <div key={title} style={integrationItem}>
            <span style={softIcon(['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#14b8a6', '#0f172a', '#ef4444'][index], 36)}><Icon size={18} /></span>
            <div><strong>{title}</strong><p>{body}</p></div>
          </div>
        })}
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

function ForecastChart({ opportunities }: { opportunities: Opportunity[] }) {
  const monthly = buildMonthlyForecast(opportunities)
  const max = Math.max(...monthly.map(item => item.amount), 1)
  return <div style={{ padding: '8px 12px 24px' }}><div style={chartArea}>{monthly.map(item => <div key={item.label} style={chartColumn}><div style={{ ...bar, height: `${Math.max((item.amount / max) * 100, 12)}%` }} /><small style={chartLabel}>{item.label}</small></div>)}</div></div>
}

function Pipeline({ stages }: { stages: { stage: OpportunityStage; count: number; amount: number }[] }) {
  const max = Math.max(...stages.map(item => item.amount), 1)
  return <div className="sales-pipeline" style={pipelineGrid}>{stages.map((item, index) => <div key={item.stage} className="sales-pipeline-row" style={{ display: 'contents' }}>
    <div style={pipelineLabel}><i style={legendDot(stageColors[index % stageColors.length])} />{item.stage}<strong>{item.count}</strong></div>
    <span style={{ ...funnelBar, width: `${Math.max((item.amount / max) * 100, 18)}%`, background: stageColors[index % stageColors.length] }} />
    <strong style={{ textAlign: 'right' }}>{money(item.amount)}</strong>
  </div>)}</div>
}

function CategoryRevenue({ categories }: { categories: { label: string; amount: number; count: number }[] }) {
  const total = categories.reduce((sum, item) => sum + item.amount, 0)
  return <div className="category-revenue" style={categoryLayout}><div style={donut}><strong>{money(total)}</strong><span>Pipeline Value</span></div><div style={{ display: 'grid', gap: 12 }}>{categories.slice(0, 5).map((item, index) => <div key={item.label} style={categoryRow}><span><i style={legendDot(stageColors[index % stageColors.length])} />{item.label}</span><strong>{money(item.amount)}</strong></div>)}</div></div>
}

function WinLossChart({ opportunities }: { opportunities: Opportunity[] }) {
  const won = opportunities.filter(item => item.stage === 'Won').length
  const lost = opportunities.filter(item => item.stage === 'Lost').length
  return <div style={{ padding: 18, display: 'grid', gap: 14 }}><MiniRow title="Won Projects" sub="Awarded contracts and project wins" value={String(won)} /><MiniRow title="Lost Projects" sub="Lost bids and inactive pursuits" value={String(lost)} /><MiniRow title="Open Pursuits" sub="Projects still in acquisition" value={String(opportunities.length - won - lost)} /></div>
}

function ConversionSummary({ opportunities, proposals, contracts, billings, reps }: { opportunities: Opportunity[]; proposals: Proposal[]; contracts: Contract[]; billings: ProgressBilling[]; reps: { label: string; amount: number; count: number }[] }) {
  const conversion = Math.round((contracts.length / Math.max(proposals.length, 1)) * 100)
  return <div style={{ padding: 18, display: 'grid', gap: 12 }}>
    <MiniRow title="Proposal to Contract" sub={`${proposals.length} proposals / ${contracts.length} contracts`} value={`${conversion}%`} />
    <MiniRow title="Projected Revenue" sub="Weighted opportunity forecast" value={money(opportunities.reduce((sum, item) => sum + item.estimatedContractValue * (item.probability / 100), 0))} />
    <MiniRow title="Open Billing Balance" sub="Financials sync queue" value={money(billings.reduce((sum, item) => sum + item.remainingBalance, 0))} />
    {reps.slice(0, 2).map(rep => <MiniRow key={rep.label} title={rep.label} sub={`${rep.count} opportunities`} value={money(rep.amount)} />)}
  </div>
}

function MiniRow({ title, sub, value }: { title: string; sub: string; value: string }) {
  return <div style={miniRow}><div style={{ minWidth: 0 }}><strong>{title}</strong><span>{sub}</span></div><b>{value}</b></div>
}

function InsightCard({ title, value, body, icon: Icon }: { title: string; value: string; body: string; icon: React.ComponentType<{ size?: number }> }) {
  return <section style={insightCard}><span style={softIcon(green, 42)}><Icon size={20} /></span><div><h3>{title}</h3><strong>{value}</strong><p>{body}</p></div></section>
}

function InsightList({ title, items }: { title: string; items: [string, string][] }) {
  return <section style={insightCard}><h3>{title}</h3>{items.length ? <div style={{ display: 'grid', gap: 10 }}>{items.slice(0, 5).map(([label, value]) => <div key={label} style={listRow}><span>{label}</span><strong>{value}</strong></div>)}</div> : <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No data yet.</p>}</section>
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div style={emptyState}><strong>{title}</strong><p>{body}</p></div>
}

function SearchFilter({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return <label style={searchBox}><Search size={15} color="#64748b" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search CRM & Sales..." style={bareInput} /></label>
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

function ViewToggle({ value, onChange }: { value: 'grid' | 'table'; onChange: (value: 'grid' | 'table') => void }) {
  return (
    <div className="sales-view-toggle" style={viewToggle}>
      <button type="button" aria-label="Grid view" onClick={() => onChange('grid')} style={viewToggleButton(value === 'grid')}><LayoutGrid size={14} /></button>
      <button type="button" aria-label="Table view" onClick={() => onChange('table')} style={viewToggleButton(value === 'table')}><List size={14} /></button>
    </div>
  )
}

function Badge({ text }: { text: string }) {
  const color = text.includes('Paid') || text === 'Won' || text === 'Qualified' || text === 'Active' || text === 'Approved' || text === 'Completed'
    ? ['#dcfce7', '#15803d']
    : text.includes('Lost') || text === 'Cancelled' || text === 'Overdue' || text === 'Rejected' || text === 'Terminated'
      ? ['#fee2e2', '#dc2626']
      : text.includes('Review') || text.includes('Negotiation') || text === 'Submitted' || text === 'Pending Signature'
        ? ['#fef3c7', '#b45309']
        : ['#dbeafe', '#1d4ed8']
  return <span style={{ background: color[0], color: color[1], borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 850, whiteSpace: 'nowrap' }}>{text}</span>
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
    opportunities: source.opportunities.map(item => ({ ...item, companyId })),
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

function filterRows(data: SalesWorkspaceData, query: string) {
  const q = query.trim().toLowerCase()
  const filter = <T,>(rows: T[]) => !q ? rows : rows.filter(row => JSON.stringify(row).toLowerCase().includes(q))
  return {
    leads: filter(data.leads),
    opportunities: filter(data.opportunities),
    siteVisits: filter(data.siteVisits),
    proposals: filter(data.proposals),
    contracts: filter(data.contracts),
    billings: filter(data.billings),
    clients: filter(data.clients),
  }
}

function totalBy<T>(rows: T[], pick: (row: T) => string, amountOf: (row: T) => number) {
  const map = new Map<string, { label: string; amount: number; count: number }>()
  rows.forEach(row => {
    const label = pick(row) || 'Unassigned'
    const current = map.get(label) || { label, amount: 0, count: 0 }
    current.amount += amountOf(row)
    current.count += 1
    map.set(label, current)
  })
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
}

function buildPipeline(opportunities: Opportunity[]) {
  return opportunityStages.map(stage => {
    const rows = opportunities.filter(item => item.stage === stage)
    return { stage, count: rows.length, amount: rows.reduce((sum, item) => sum + item.estimatedContractValue, 0) }
  })
}

function buildMonthlyForecast(opportunities: Opportunity[]) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
  const totals = new Map<string, number>()
  opportunities.forEach(opportunity => {
    const parsed = new Date(`${opportunity.expectedCloseDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    totals.set(key, (totals.get(key) || 0) + opportunity.estimatedContractValue * (opportunity.probability / 100))
  })
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, amount]) => {
      const [year, month] = key.split('-').map(Number)
      return { label: formatter.format(new Date(year, month - 1, 1)), amount }
    })
}

function billingSchedule(contract: Contract, companyId?: string): ProgressBilling[] {
  const rows = [
    ['20% Downpayment', 0.2],
    ['30% Structural Completion', 0.3],
    ['30% Finishing', 0.3],
    ['20% Turnover', 0.2],
  ] as const
  return rows.map(([milestone, percent], index) => {
    const amount = contract.contractAmount * percent
    return {
      id: `${contract.id.replace('CON', 'BILL')}-${index + 1}`,
      companyId,
      project: contract.projectName,
      milestone,
      amount,
      dueDate: addDays(contract.startDate, 30 * (index + 1)),
      paidAmount: 0,
      remainingBalance: amount,
      status: index === 0 ? 'Sent' : 'Draft' as BillingStatus,
    }
  })
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

function nextCode(prefix: string, ids: string[]) {
  const next = ids.reduce((max, id) => {
    const number = Number(id.replace(/\D/g, ''))
    return Number.isFinite(number) ? Math.max(max, number) : max
  }, 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value || 0)
}

function date(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value || '-' : parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function addDays(value: string, days: number) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10)
  parsed.setDate(parsed.getDate() + days)
  return parsed.toISOString().slice(0, 10)
}

const stageColors = ['#2563eb', '#60a5fa', '#8b5cf6', '#f59e0b', '#14b8a6', '#64748b', '#10b981', '#ef4444']
const pageHeader: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', minWidth: 0 }
const h1: CSSProperties = { margin: 0, fontSize: 30, lineHeight: 1.08, fontWeight: 900, color: '#020617', letterSpacing: 0 }
const subtitleStyle: CSSProperties = { margin: '7px 0 0', fontSize: 14, color: '#475569', fontWeight: 500, maxWidth: 760 }
const actionsWrap: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
const primaryButton: CSSProperties = { height: 38, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '0 15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 850, cursor: 'pointer', textDecoration: 'none' }
const secondaryButton: CSSProperties = { height: 38, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', borderRadius: 8, padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }
const workflowStrip: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 10 }
const workflowStep: CSSProperties = { minHeight: 48, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', fontSize: 12, fontWeight: 850 }
const workflowNumber: CSSProperties = { width: 24, height: 24, borderRadius: 999, background: '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: 11, flex: '0 0 auto' }
const metricGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, minWidth: 0 }
const metricCard: CSSProperties = { minHeight: 118, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 28px rgba(15,23,42,.04)', minWidth: 0 }
const statLabel: CSSProperties = { color: '#475569', fontSize: 13, fontWeight: 750 }
const statValue: CSSProperties = { color: '#020617', fontSize: 24, fontWeight: 900, marginTop: 6, overflowWrap: 'anywhere' }
const statDetail: CSSProperties = { color: green, fontSize: 12, fontWeight: 750, marginTop: 8 }
const tabsStyle: CSSProperties = { display: 'flex', gap: 26, borderBottom: '1px solid #e2e8f0', overflowX: 'auto', minWidth: 0 }
const topGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr) minmax(260px, .82fr)', gap: 16, minWidth: 0 }
const bottomGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, .8fr)', gap: 16, minWidth: 0 }
const panel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,.04)', overflow: 'hidden', minWidth: 0 }
const panelHeader: CSSProperties = { minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 18px', borderBottom: '1px solid #eef2f7', minWidth: 0 }
const panelTitle: CSSProperties = { margin: 0, color: '#020617', fontSize: 15, fontWeight: 900 }
const emptyState: CSSProperties = { minHeight: 154, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 6, padding: 24, color: '#64748b', textAlign: 'center', fontSize: 13 }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', minWidth: 1040 }
const thStyle: CSSProperties = { padding: '13px 14px', color: '#475569', background: '#f8fafc', fontSize: 11, fontWeight: 900, textAlign: 'left', whiteSpace: 'nowrap' }
const tdStyle: CSSProperties = { padding: '13px 14px', borderTop: '1px solid #edf2f7', color: '#0f172a', fontSize: 12, whiteSpace: 'nowrap', verticalAlign: 'top' }
const viewAll: CSSProperties = { color: '#2563eb', fontSize: 12, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }
const viewToggle: CSSProperties = { display: 'inline-grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #dbe3ea', borderRadius: 8, overflow: 'hidden', background: '#fff' }
const viewToggleButton = (active: boolean): CSSProperties => ({ width: 30, height: 30, border: 0, borderRight: active ? 0 : '1px solid #e2e8f0', background: active ? '#16a34a' : '#fff', color: active ? '#fff' : '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer' })
const miniSelect: CSSProperties = { height: 34, border: '1px solid #dbe3ea', borderRadius: 8, padding: '0 10px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 750 }
const searchBox: CSSProperties = { height: 34, width: 'min(260px, 48vw)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff' }
const bareInput: CSSProperties = { border: 0, outline: 0, minWidth: 0, flex: 1, fontSize: 12, background: 'transparent', color: '#0f172a' }
const smallButton: CSSProperties = { minHeight: 30, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', borderRadius: 7, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 850, cursor: 'pointer' }
const iconButton: CSSProperties = { width: 34, height: 34, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', color: '#334155', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const chartArea: CSSProperties = { height: 230, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(38px, 1fr))', gap: 16, alignItems: 'end', padding: '18px 10px 0', borderBottom: '1px solid #e2e8f0', background: 'repeating-linear-gradient(to top, transparent 0 44px, #eef2f7 45px)', overflowX: 'auto' }
const chartColumn: CSSProperties = { height: '100%', display: 'grid', alignItems: 'end', justifyItems: 'center', position: 'relative' }
const bar: CSSProperties = { width: 24, minHeight: 20, borderRadius: '7px 7px 0 0', background: 'linear-gradient(180deg, #22c55e, #15803d)' }
const chartLabel: CSSProperties = { position: 'absolute', bottom: -24, color: '#64748b', fontSize: 11, fontWeight: 700 }
const pipelineGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(120px, 170px) minmax(90px, 1fr) minmax(110px, 130px)', gap: 12, alignItems: 'center', padding: 18 }
const pipelineLabel: CSSProperties = { display: 'grid', gap: 4, color: '#475569', fontSize: 12, fontWeight: 750 }
const funnelBar: CSSProperties = { height: 28, borderRadius: 7, clipPath: 'polygon(8% 0, 92% 0, 80% 100%, 20% 100%)', justifySelf: 'center' }
const categoryLayout: CSSProperties = { display: 'grid', gridTemplateColumns: '135px minmax(0, 1fr)', alignItems: 'center', gap: 18, padding: 18 }
const donut: CSSProperties = { width: 126, height: 126, borderRadius: '50%', background: 'conic-gradient(#16a34a 0 40%, #2563eb 40% 70%, #8b5cf6 70% 90%, #f59e0b 90% 100%)', display: 'grid', placeItems: 'center', position: 'relative', color: '#0f172a', textAlign: 'center', fontSize: 11 }
const categoryRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, minWidth: 0 }
const analyticsGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, padding: 18 }
const insightCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, display: 'grid', gap: 10, alignContent: 'start' }
const listRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569', fontSize: 13 }
const integrationPanel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }
const integrationGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }
const integrationItem: CSSProperties = { display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid #eef2f7', borderRadius: 9, padding: 12, color: '#475569', fontSize: 12 }
const successBox: CSSProperties = { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 800, display: 'flex', justifyContent: 'space-between', gap: 12 }
const dismissButton: CSSProperties = { border: 0, background: 'transparent', color: '#166534', cursor: 'pointer', display: 'grid', placeItems: 'center' }
const newMenu: CSSProperties = { position: 'absolute', right: 0, top: 44, zIndex: 10, width: 210, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 18px 40px rgba(15,23,42,.16)', padding: 6 }
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
const kanbanGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(230px, 1fr))', gap: 12, padding: 14, overflowX: 'auto' }
const kanbanColumn: CSSProperties = { minHeight: 260, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: 10, display: 'grid', gap: 10, alignContent: 'start' }
const kanbanHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a', fontSize: 12, fontWeight: 900 }
const kanbanCard: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'grid', gap: 7, fontSize: 12, color: '#475569', boxShadow: '0 8px 20px rgba(15,23,42,.04)' }
const kanbanEmpty: CSSProperties = { margin: 0, color: '#94a3b8', fontSize: 12 }
const miniRow: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', border: '1px solid #eef2f7', borderRadius: 9, padding: 12, color: '#475569', fontSize: 12 }
const softIcon = (color: string, size = 54): CSSProperties => ({ width: size, height: size, borderRadius: 14, background: `${color}16`, color, display: 'grid', placeItems: 'center', flex: '0 0 auto' })
const tabStyle = (active: boolean): CSSProperties => ({ border: 0, background: 'transparent', padding: '8px 13px', margin: 0, color: active ? '#111827' : '#334155', borderBottom: active ? '2px solid #111827' : '2px solid transparent', borderRadius: 0, fontSize: 13, fontWeight: active ? 900 : 750, cursor: 'pointer', whiteSpace: 'nowrap' })
const legendDot = (color: string): CSSProperties => ({ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block', marginRight: 8 })
