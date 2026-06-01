'use client'

import {
  Activity,
  AlignLeft,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  FileSpreadsheet,
  Filter,
  Folder,
  Grid2X2,
  Hash,
  KeyRound,
  LocateFixed,
  Link2,
  ListChecks,
  LockKeyhole,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Paperclip,
  Phone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sigma,
  Table2,
  Text,
  Trash2,
  Undo2,
  UploadCloud,
  User,
  Users,
  Workflow,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { DragEvent, FormEvent, MouseEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import CompanySwitcher from '@/components/CompanySwitcher'
import StateFeedback from '@/components/StateFeedback'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'
import { uploadFileObject } from '@/lib/uploads/client'
import { listBusinessRecords } from '@/lib/business/client'
import type { BusinessCollection } from '@/lib/business/collections'

type DatasetSection =
  | 'overview'
  | 'tables'
  | 'views'
  | 'imports'
  | 'relationships'
  | 'automations'
  | 'quality-rules'
  | 'access-keys'
  | 'history'
  | 'docs'
  | 'settings'

type RowHeightOption = 'Short' | 'Medium' | 'Tall' | 'Extra Tall'
type SortDirection = 'asc' | 'desc'
type FilterOperator = 'contains' | 'not_contains' | 'is' | 'is_not' | 'is_empty' | 'is_not_empty'
type FilterJoin = 'AND' | 'OR'
type FilterRule = { id: string; fieldId: string; operator: FilterOperator; value: string; join: FilterJoin }
type ExportCell = string | { text: string; html: string }

type FieldType =
  | 'Link to another record (beta)'
  | 'Rollup (beta)'
  | 'Simple text'
  | 'Number, integer'
  | 'Number, with decimal-points'
  | 'Multi-line text'
  | 'Multi-line text editor'
  | 'Dropdown, single'
  | 'Dropdown, multiple'
  | 'Client dropdown'
  | 'Date picker'
  | 'Date & time picker'
  | 'Time picker'
  | 'Checkbox'
  | 'File upload'
  | 'Simple list'
  | 'Table'
  | 'Custom formula'
  | 'Title - Separator'
  | 'Location'
  | 'Multiple users'
  | 'Single user'
  | 'Email'
  | 'Phone number'
  | 'Progress'
  | 'URL'
  | 'Link dataset record'
  | 'Link service record (Beta)'
  | 'Multiple files'
  | 'Lookup (beta)'
  | 'Text'
  | 'Long text'
  | 'Number'
  | 'Currency'
  | 'Date'
  | 'Select'
  | 'Phone'
  | 'Linked record'
type QualityRuleType = 'Required value' | 'Unique value' | 'Email format' | 'Number format'

type DatasetField = {
  id: string
  label: string
  key: string
  type: FieldType
  required: boolean
  options: string[]
  linkedDatasetId?: string
  description?: string
  linkedFieldId?: string
  allowMultiple?: boolean
  rollupSourceFieldId?: string
  rollupFieldId?: string
  aggregateFunction?: string
  rollupConditions?: boolean
  formula?: string
  typeName?: string
}

type DatasetRecord = {
  id: string
  values: Record<string, string>
  createdBy: string
  createdAt: string
  updatedAt: string
}

type DatasetView = {
  id: string
  name: string
  enabled: boolean
  default?: boolean
  filterFieldId?: string
  filterValue?: string
  records?: DatasetRecord[]
}

type Dataset = {
  id: string
  name: string
  description: string
  status: 'ACTIVE' | 'PAUSED'
  folder: string
  owner: string
  source: string
  owners?: string[]
  followers?: string[]
  recordVisibility?: string
  accessMode?: 'everyone' | 'limited'
  createMode?: 'everyone' | 'limited'
  customNaming?: boolean
  leadingFieldName?: string
  allowPublicSelect?: boolean
  allowAdvancedTable?: boolean
  performanceBoosting?: boolean
  fields: DatasetField[]
  records: DatasetRecord[]
  views: DatasetView[]
  createdAt: string
  updatedAt: string
}

type FolderItem = {
  id: string
  name: string
  description: string
  createdAt: string
}

type Relationship = {
  id: string
  fromDatasetId: string
  fromFieldId: string
  toDatasetId: string
  label: string
  createdAt: string
}

type Automation = {
  id: string
  name: string
  datasetId: string
  trigger: string
  action: string
  enabled: boolean
  createdAt: string
}

type QualityRule = {
  id: string
  name: string
  datasetId: string
  fieldId: string
  type: QualityRuleType
  enabled: boolean
  createdAt: string
}

type AccessKey = {
  id: string
  name: string
  scope: string
  status: 'ACTIVE' | 'PAUSED'
  token: string
  createdAt: string
}

type HistoryEvent = {
  id: string
  action: string
  detail: string
  createdAt: string
}

type WorkspaceSettings = {
  strictValidation: boolean
  auditHistory: boolean
  syncWarnings: boolean
  defaultOwner: string
  clientDatasetTemplateSeeded: boolean
}

type WorkspaceState = {
  datasets: Dataset[]
  folders: FolderItem[]
  relationships: Relationship[]
  automations: Automation[]
  qualityRules: QualityRule[]
  accessKeys: AccessKey[]
  settings: WorkspaceSettings
  history: HistoryEvent[]
}

type ModalName = 'dataset' | 'template' | 'fieldPicker' | 'field' | 'record' | 'view' | 'import' | 'relationship' | 'automation' | 'quality' | 'key' | 'folder' | null

type StoredRow = Record<string, unknown>
type ClientChoice = { value: string; label: string; detail: string }
type FolderGroup = { id: string; name: string; description: string; datasets: Dataset[]; createdAt: string }
type SourceFieldDefinition =
  | readonly [string, string, FieldType, boolean]
  | readonly [string, string, FieldType, boolean, readonly string[]]
type SourceDefinition = {
  label: string
  storageKeys: string[]
  businessCollection?: BusinessCollection
  datasetName: string
  folder: string
  fields: readonly SourceFieldDefinition[]
  map: (row: StoredRow) => Record<string, string>
}

const storageKey = 'wiseflow-rework-datasets-workspace'
const legacyStorageKey = 'wiseflow-rework-datasets'
const previousStorageKey = 'wiseflow-datasets'

const emptyState: WorkspaceState = {
  datasets: [],
  folders: [],
  relationships: [],
  automations: [],
  qualityRules: [],
  accessKeys: [],
  settings: {
    strictValidation: true,
    auditHistory: true,
    syncWarnings: true,
    defaultOwner: '',
    clientDatasetTemplateSeeded: false,
  },
  history: [],
}

const clientImportTemplateSource = 'Client Dataset Template'
const clientImportTemplateName = 'Client Import Template'
const paymentTermOptions = ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60']
const annualRevenueOptions = ['Below PHP 10M', 'PHP 10M - PHP 20M', 'PHP 20M - PHP 50M', 'PHP 50M - PHP 100M', 'PHP 100M+']
const companyTypeOptions = ['Private', 'Corporation', 'Startup', 'Government', 'Non-profit']
const companySizeOptions = ['1 - 10 employees', '11 - 50 employees', '51 - 200 employees', '201 - 500 employees', '500+ employees']
const industryOptions = ['Technology', 'Construction', 'Residential', 'Consulting', 'IT Services', 'Logistics', 'Marketing', 'Healthcare', 'Finance']

const fieldTypes: FieldType[] = [
  'Link to another record (beta)',
  'Rollup (beta)',
  'Simple text',
  'Number, integer',
  'Number, with decimal-points',
  'Multi-line text',
  'Multi-line text editor',
  'Dropdown, single',
  'Dropdown, multiple',
  'Client dropdown',
  'Date picker',
  'Date & time picker',
  'Time picker',
  'Checkbox',
  'File upload',
  'Simple list',
  'Table',
  'Custom formula',
  'Title - Separator',
  'Location',
  'Multiple users',
  'Single user',
  'Email',
  'Phone number',
  'Progress',
  'URL',
  'Link dataset record',
  'Link service record (Beta)',
  'Multiple files',
  'Lookup (beta)',
]

const fieldCards: Array<{ type: FieldType; description: string; tone: string; icon: ReactNode }> = [
  { type: 'Link to another record (beta)', description: 'Link this field with other records in dataset', tone: 'blue', icon: <Link2 size={16} /> },
  { type: 'Rollup (beta)', description: 'Aggregate values from linked records (count, sum, average, min, max)', tone: 'blue', icon: <Sigma size={16} /> },
  { type: 'Simple text', description: 'Single line of text', tone: 'cyan', icon: <Text size={16} /> },
  { type: 'Number, integer', description: 'Number, integer value', tone: 'green', icon: <Hash size={16} /> },
  { type: 'Number, with decimal-points', description: 'Number, with decimals', tone: 'green', icon: <Hash size={16} /> },
  { type: 'Multi-line text', description: 'Text with multiple lines', tone: 'indigo', icon: <ListChecks size={16} /> },
  { type: 'Multi-line text editor', description: 'Long text with default editor', tone: 'yellow', icon: <AlignLeft size={16} /> },
  { type: 'Dropdown, single', description: 'Select a single choice', tone: 'orange', icon: <ChevronDown size={16} /> },
  { type: 'Dropdown, multiple', description: 'Select multiple choices', tone: 'red', icon: <ListChecks size={16} /> },
  { type: 'Client dropdown', description: 'Select a client record', tone: 'green', icon: <Users size={16} /> },
  { type: 'Date picker', description: 'Date type, select a date', tone: 'pink', icon: <CalendarDays size={16} /> },
  { type: 'Date & time picker', description: 'Datetime type, select date and time', tone: 'cyan', icon: <CalendarDays size={16} /> },
  { type: 'Time picker', description: 'Pick a time', tone: 'orange', icon: <Clock3 size={16} /> },
  { type: 'Checkbox', description: 'Single checkbox', tone: 'cyan', icon: <CheckSquare size={16} /> },
  { type: 'File upload', description: 'File upload', tone: 'blue', icon: <Paperclip size={16} /> },
  { type: 'Simple list', description: 'List with multiple items', tone: 'green', icon: <ListChecks size={16} /> },
  { type: 'Table', description: 'Table with multiple rows', tone: 'purple', icon: <Table2 size={16} /> },
  { type: 'Custom formula', description: 'Excel-based custom formula', tone: 'red', icon: <Sigma size={16} /> },
  { type: 'Title - Separator', description: 'Separator between rows', tone: 'green', icon: <Text size={16} /> },
  { type: 'Location', description: 'Pick a location', tone: 'blue', icon: <LocateFixed size={16} /> },
  { type: 'Multiple users', description: 'Link to list of user', tone: 'purple', icon: <Users size={16} /> },
  { type: 'Single user', description: 'Link to an user', tone: 'slate', icon: <User size={16} /> },
  { type: 'Email', description: 'Single email', tone: 'slate', icon: <Mail size={16} /> },
  { type: 'Phone number', description: 'Single phone number', tone: 'slate', icon: <Phone size={16} /> },
  { type: 'Progress', description: 'Progress', tone: 'blue', icon: <Hash size={16} /> },
  { type: 'URL', description: 'URL Link', tone: 'cyan', icon: <Link2 size={16} /> },
  { type: 'Link dataset record', description: 'Link field to record in Dataset', tone: 'green', icon: <Database size={16} /> },
  { type: 'Link service record (Beta)', description: 'Link field to record in Service', tone: 'orange', icon: <Link2 size={16} /> },
  { type: 'Multiple files', description: 'Pick multiple files', tone: 'blue', icon: <Paperclip size={16} /> },
  { type: 'Lookup (beta)', description: 'See values from a field in a linked record', tone: 'purple', icon: <Search size={16} /> },
]
const sourceDefinitions: SourceDefinition[] = [
  {
    label: 'Client Database',
    storageKeys: ['flowsys-clients'],
    businessCollection: 'clients',
    datasetName: 'Client Master',
    folder: 'CRM',
    fields: [
      ['client_type', 'Client Type', 'Select', false],
      ['name', 'Client Name', 'Text', true],
      ['email', 'Company Email', 'Email', false],
      ['phone', 'Phone Number', 'Phone', false],
      ['website', 'Company Website', 'URL', false],
      ['industry', 'Industry', 'Select', false, industryOptions],
      ['company_size', 'Company Size', 'Select', false, companySizeOptions],
      ['company_type', 'Company Type', 'Select', false, companyTypeOptions],
      ['tax_id', 'Tax ID / VAT Number', 'Text', false],
      ['annual_revenue', 'Annual Revenue', 'Select', false, annualRevenueOptions],
      ['billing_address', 'Billing Address', 'Long text', false],
      ['account_manager', 'Account Manager', 'Single user', false],
      ['default_currency', 'Default Currency', 'Select', false],
      ['payment_terms', 'Payment Terms', 'Select', false, paymentTermOptions],
      ['description', 'Description / Notes', 'Long text', false],
      ['tags', 'Tags', 'Text', false],
      ['status', 'Status', 'Select', false],
    ] as const,
    map: (row: StoredRow) => ({
      client_type: text(row.clientType),
      name: text(row.name ?? row.clientName ?? row.companyName),
      email: text(row.email),
      phone: text(row.phone),
      website: text(row.website),
      industry: text(row.industry),
      company_size: text(row.companySize),
      company_type: text(row.companyType),
      tax_id: text(row.taxId),
      annual_revenue: text(row.annualRevenue),
      billing_address: text(row.billingAddress),
      account_manager: text(row.accountManager),
      default_currency: text(row.defaultCurrency),
      payment_terms: text(row.paymentTerms),
      description: text(row.description),
      tags: Array.isArray(row.tags) ? row.tags.map(text).filter(Boolean).join(', ') : text(row.tags),
      status: text(row.stage ?? row.status),
    }),
  },
  {
    label: 'Supplier Database',
    storageKeys: ['flowsys-suppliers'],
    businessCollection: 'suppliers',
    datasetName: 'Supplier Registry',
    folder: 'Supply Chain',
    fields: [
      ['name', 'Supplier Name', 'Text', true],
      ['category', 'Category', 'Text', false],
      ['email', 'Email', 'Email', false],
      ['phone', 'Phone', 'Phone', false],
      ['terms', 'Payment Terms', 'Text', false],
    ] as const,
    map: (row: StoredRow) => ({
      name: text(row.name ?? row.companyName ?? row.vendorName),
      category: text(row.category ?? row.type),
      email: text(row.email ?? row.contactEmail),
      phone: text(row.phone),
      terms: text(row.paymentTerms ?? row.terms),
    }),
  },
  {
    label: 'Procurement Pricebook',
    storageKeys: ['flowsys-pricebook-items'],
    businessCollection: 'pricebook-items',
    datasetName: 'Pricebook Items',
    folder: 'Procurement',
    fields: [
      ['sku', 'SKU', 'Text', true],
      ['name', 'Item Name', 'Text', true],
      ['unit', 'Unit', 'Text', false],
      ['cost', 'Base Cost', 'Currency', false],
      ['price', 'Selling Price', 'Currency', false],
    ] as const,
    map: (row: StoredRow) => ({
      sku: text(row.sku),
      name: text(row.name ?? row.itemName ?? row.description),
      unit: text(row.unit ?? row.uom),
      cost: text(row.cost ?? row.baseCost),
      price: text(row.price ?? row.sellingPrice),
    }),
  },
  {
    label: 'HR Employees',
    storageKeys: ['flowsys-hr-employees'],
    datasetName: 'Employee Directory',
    folder: 'People',
    fields: [
      ['name', 'Employee Name', 'Text', true],
      ['department', 'Department', 'Text', false],
      ['role', 'Role', 'Text', false],
      ['email', 'Email', 'Email', false],
      ['status', 'Status', 'Select', false],
    ] as const,
    map: (row: StoredRow) => ({
      name: text(row.name ?? row.fullName ?? row.employeeName),
      department: text(row.department),
      role: text(row.role ?? row.position ?? row.jobTitle),
      email: text(row.email),
      status: text(row.status),
    }),
  },
  {
    label: 'Warehouse Inventory',
    storageKeys: ['flowsys-warehouse-inventory', 'wiseflow-warehouse-workspace'],
    businessCollection: 'warehouse-inventory',
    datasetName: 'Warehouse Items',
    folder: 'Warehouse',
    fields: [
      ['sku', 'SKU', 'Text', true],
      ['name', 'Item Name', 'Text', true],
      ['location', 'Location', 'Text', false],
      ['quantity', 'Quantity', 'Number', false],
      ['unit', 'Unit', 'Text', false],
    ] as const,
    map: (row: StoredRow) => ({
      sku: text(row.sku),
      name: text(row.name ?? row.itemName),
      location: text(row.location ?? row.warehouse),
      quantity: text(row.quantity ?? row.stock ?? row.stockOnHand ?? row.onHand),
      unit: text(row.unit ?? row.uom),
    }),
  },
]

export default function ReworkDatasetsModule({ section = 'overview' }: { section?: DatasetSection }) {
  const [companyId, setCompanyId] = useState('')
  const [state, setState] = useState<WorkspaceState>(emptyState)
  const [selectedDatasetId, setSelectedDatasetId] = useState('')
  const [activeViewId, setActiveViewId] = useState('')
  const [query, setQuery] = useState('')
  const [recordQuery, setRecordQuery] = useState('')
  const [modal, setModal] = useState<ModalName>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [addFieldTab, setAddFieldTab] = useState<'new' | 'existing'>('new')
  const [showDatasetDetail, setShowDatasetDetail] = useState(false)
  const [showFoldersPage, setShowFoldersPage] = useState(false)
  const [sourceRows, setSourceRows] = useState<Record<string, StoredRow[]>>({})
  const [syncingSource, setSyncingSource] = useState('')

  useEffect(() => {
    const load = () => {
      const activeCompanyId = getActiveCompany()?.id || ''
      const account = readAccount()
      const loaded = loadWorkspace(activeCompanyId, account.name)
      setCompanyId(activeCompanyId)
      setState(loaded)
      setSelectedDatasetId(previous => previous && loaded.datasets.some(dataset => dataset.id === previous) ? previous : loaded.datasets[0]?.id || '')
      setActiveViewId(previous => previous || loaded.datasets[0]?.views[0]?.id || '')
    }

    load()
    window.addEventListener('storage', load)
    window.addEventListener(companyChangeEvent, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener(companyChangeEvent, load)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.all(sourceDefinitions.map(async source => {
      const rows = await loadSourceRows(source, companyId)
      return [source.label, rows] as const
    })).then(entries => {
      if (!cancelled) setSourceRows(Object.fromEntries(entries))
    })

    return () => {
      cancelled = true
    }
  }, [companyId])

  const account = useMemo(() => readAccount(), [])
  const selectedDataset = state.datasets.find(dataset => dataset.id === selectedDatasetId) || state.datasets[0]
  const activeView = selectedDataset?.views.find(view => view.id === activeViewId) || selectedDataset?.views.find(view => view.default) || selectedDataset?.views[0]
  const clientChoices = loadClientChoices(companyId)

  const filteredDatasets = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return state.datasets.filter(dataset => !needle || [dataset.name, dataset.description, dataset.folder, dataset.owner, dataset.source].join(' ').toLowerCase().includes(needle))
  }, [query, state.datasets])

  const filteredRecords = useMemo(() => {
    if (!selectedDataset) return []
    const needle = recordQuery.trim().toLowerCase()
    // Default view shares dataset.records; non-default views own their own.
    const sourceRecords = activeView && !activeView.default
      ? (activeView.records ?? [])
      : selectedDataset.records
    return sourceRecords.filter(record => {
      const matchesQuery = !needle || Object.values(record.values).join(' ').toLowerCase().includes(needle)
      const matchesView = !activeView?.filterFieldId || !activeView.filterValue || record.values[activeView.filterFieldId]?.toLowerCase().includes(activeView.filterValue.toLowerCase())
      return matchesQuery && matchesView
    })
  }, [activeView, recordQuery, selectedDataset])

  const stats = useMemo(() => {
    const records = state.datasets.reduce((sum, dataset) => sum + dataset.records.length, 0)
    const fields = state.datasets.reduce((sum, dataset) => sum + dataset.fields.length, 0)
    const quality = state.datasets.length ? Math.round(state.datasets.reduce((sum, dataset) => sum + qualityScore(dataset, state.qualityRules), 0) / state.datasets.length) : 0
    return { datasets: state.datasets.length, records, fields, views: state.datasets.reduce((sum, dataset) => sum + dataset.views.length, 0), quality }
  }, [state.datasets, state.qualityRules])

  const sidebarFolderGroups = useMemo(() => {
    const folderRecords = new Map(state.folders.map(folder => [folder.name, folder]))
    const folderNames = new Set<string>(folderRecords.keys())
    state.datasets.forEach(dataset => folderNames.add(dataset.folder || 'Uncategorized'))

    return Array.from(folderNames)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((folderName): FolderGroup => ({
        id: folderRecords.get(folderName)?.id || slugify(folderName),
        name: folderName,
        description: folderRecords.get(folderName)?.description || '',
        datasets: state.datasets.filter(dataset => (dataset.folder || 'Uncategorized') === folderName),
        createdAt: folderRecords.get(folderName)?.createdAt || now(),
      }))
  }, [state.datasets, state.folders])

  function save(nextState: WorkspaceState, action?: string, detail?: string) {
    const withHistory = action && state.settings.auditHistory
      ? { ...nextState, history: [{ id: id('hist'), action, detail: detail || '', createdAt: now() }, ...nextState.history].slice(0, 120) }
      : nextState
    setState(withHistory)
    persistWorkspace(companyId, withHistory)
  }

  function updateDataset(nextDataset: Dataset, action?: string) {
    save({ ...state, datasets: state.datasets.map(dataset => dataset.id === nextDataset.id ? nextDataset : dataset) }, action, nextDataset.name)
  }

  function openDataset(datasetId: string) {
    const dataset = state.datasets.find(item => item.id === datasetId)
    if (!dataset) return
    setSelectedDatasetId(dataset.id)
    setActiveViewId(dataset.views.find(view => view.default)?.id || dataset.views[0]?.id || '')
    setShowFoldersPage(false)
    setShowDatasetDetail(true)
  }

  function openModal(name: ModalName, initial: Record<string, string> = {}) {
    setForm(initial)
    if (name === 'fieldPicker') setAddFieldTab('new')
    setModal(name)
  }

  function closeModal() {
    setModal(null)
    setForm({})
  }

  function createDataset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name?.trim()
    if (!name) return
    const dataset = makeDataset({
      name,
      description: form.description || '',
      folder: form.folder || 'Uncategorized',
      owner: form.owner || state.settings.defaultOwner || account.name,
      source: 'Manual',
      fields: defaultDatasetFields(),
      records: [],
    })
    save({ ...state, datasets: [dataset, ...state.datasets] }, 'Created dataset', dataset.name)
    setSelectedDatasetId(dataset.id)
    setActiveViewId(dataset.views[0]?.id || '')
    setShowFoldersPage(false)
    setShowDatasetDetail(true)
    closeModal()
  }

  function applyClientImportTemplate() {
    const timestamp = now()
    const template = makeClientImportTemplateDataset(state.settings.defaultOwner || account.name)
    const templateFields = ensureDefaultDatasetFields(template.fields)
    const existingTemplate = state.datasets.find(isClientImportTemplateDataset)
    const folders = state.folders.some(folder => folder.name === 'CRM')
      ? state.folders
      : [{ id: 'folder_client_import_template_crm', name: 'CRM', description: 'Client import-ready datasets.', createdAt: timestamp }, ...state.folders]

    if (existingTemplate) {
      const restoredTemplate: Dataset = {
        ...existingTemplate,
        name: clientImportTemplateName,
        description: template.description,
        folder: 'CRM',
        source: clientImportTemplateSource,
        owner: existingTemplate.owner || template.owner,
        fields: templateFields,
        records: existingTemplate.records.length ? existingTemplate.records : template.records,
        views: existingTemplate.views.length ? existingTemplate.views : template.views,
        updatedAt: timestamp,
      }

      save({
        ...state,
        settings: { ...state.settings, clientDatasetTemplateSeeded: true },
        folders,
        datasets: state.datasets.map(dataset => dataset.id === existingTemplate.id ? restoredTemplate : dataset),
      }, 'Restored template', clientImportTemplateName)
      setSelectedDatasetId(restoredTemplate.id)
      setActiveViewId(restoredTemplate.views.find(view => view.default)?.id || restoredTemplate.views[0]?.id || '')
      setShowFoldersPage(false)
      setShowDatasetDetail(true)
      closeModal()
      return
    }

    const dataset: Dataset = {
      ...template,
      fields: templateFields,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    save({
      ...state,
      settings: { ...state.settings, clientDatasetTemplateSeeded: true },
      folders,
      datasets: [dataset, ...state.datasets],
    }, 'Created template', clientImportTemplateName)
    setSelectedDatasetId(dataset.id)
    setActiveViewId(dataset.views.find(view => view.default)?.id || dataset.views[0]?.id || '')
    setShowFoldersPage(false)
    setShowDatasetDetail(true)
    closeModal()
  }

  function deleteDataset(datasetId: string) {
    const dataset = state.datasets.find(item => item.id === datasetId)
    const nextDatasets = state.datasets.filter(item => item.id !== datasetId)
    save({
      ...state,
      datasets: nextDatasets,
      relationships: state.relationships.filter(item => item.fromDatasetId !== datasetId && item.toDatasetId !== datasetId),
      automations: state.automations.filter(item => item.datasetId !== datasetId),
      qualityRules: state.qualityRules.filter(item => item.datasetId !== datasetId),
    }, 'Deleted dataset', dataset?.name || datasetId)
    if (selectedDatasetId === datasetId) {
      setSelectedDatasetId(nextDatasets[0]?.id || '')
      setActiveViewId(nextDatasets[0]?.views[0]?.id || '')
    }
  }

  function createField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDataset) return
    const label = form.label?.trim()
    if (!label) return
    const field = makeField(uniqueKey(selectedDataset.fields, label), label, (form.type as FieldType) || 'Text', form.required === 'true', parseOptions(form.options), form.linkedDatasetId, {
      allowMultiple: form.allowMultiple === 'true',
      rollupSourceFieldId: form.rollupSourceFieldId,
      rollupFieldId: form.rollupFieldId,
      aggregateFunction: form.aggregateFunction || 'Count',
      rollupConditions: form.rollupConditions === 'true',
      description: form.description,
      formula: form.formula,
    })
    updateDataset({ ...selectedDataset, fields: [...selectedDataset.fields, field], updatedAt: now() }, 'Added field')
    closeModal()
  }

  function startField(type: FieldType) {
    setForm({
      type,
      required: 'false',
      ...(type === 'Client dropdown' ? { label: 'Client' } : {}),
      ...(type === 'Link to another record (beta)' ? { label: 'Link to another record', allowMultiple: 'false' } : {}),
      ...(type === 'Rollup (beta)' ? { label: 'Rollup beta', aggregateFunction: 'Count', rollupConditions: 'false' } : {}),
    })
    setModal('field')
  }

  function copyExistingField(field: DatasetField) {
    if (!selectedDataset) return
    const fieldId = uniqueKey(selectedDataset.fields, field.label)
    const nextField: DatasetField = {
      ...field,
      id: fieldId,
      key: fieldId,
      label: selectedDataset.fields.some(item => item.label === field.label) ? `${field.label} copy` : field.label,
    }
    updateDataset({ ...selectedDataset, fields: [...selectedDataset.fields, nextField], updatedAt: now() }, 'Added existing field')
    closeModal()
  }

  function deleteField(fieldId: string) {
    if (!selectedDataset) return
    const nextRecords = selectedDataset.records.map(record => {
      const values = { ...record.values }
      delete values[fieldId]
      return { ...record, values, updatedAt: now() }
    })
    updateDataset({
      ...selectedDataset,
      fields: selectedDataset.fields.filter(field => field.id !== fieldId),
      records: nextRecords,
      views: selectedDataset.views.map(view => view.filterFieldId === fieldId ? { ...view, filterFieldId: undefined, filterValue: undefined } : view),
      updatedAt: now(),
    }, 'Deleted field')
  }

  function reorderFields(draggedFieldId: string, targetFieldId: string) {
    if (!selectedDataset || draggedFieldId === targetFieldId) return
    const fromIndex = selectedDataset.fields.findIndex(field => field.id === draggedFieldId)
    const toIndex = selectedDataset.fields.findIndex(field => field.id === targetFieldId)
    if (fromIndex < 0 || toIndex < 0) return
    const fields = [...selectedDataset.fields]
    const [draggedField] = fields.splice(fromIndex, 1)
    fields.splice(toIndex, 0, draggedField)
    updateDataset({ ...selectedDataset, fields, updatedAt: now() }, 'Reordered fields')
  }

  // When the active tab is a non-default view, records live on the view itself.
  // Otherwise they live on the dataset. These helpers transparently route the write.
  function viewOwnsRecords(): boolean {
    return !!(activeView && !activeView.default)
  }

  function withMutatedRecords(
    dataset: Dataset,
    mutate: (records: DatasetRecord[]) => DatasetRecord[],
    timestamp: string,
  ): Dataset {
    if (viewOwnsRecords() && activeView) {
      return {
        ...dataset,
        views: dataset.views.map(view => view.id === activeView.id
          ? { ...view, records: mutate(view.records ?? []) }
          : view),
        updatedAt: timestamp,
      }
    }
    return { ...dataset, records: mutate(dataset.records), updatedAt: timestamp }
  }

  function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDataset) return
    const editableFields = selectedDataset.fields.filter(field => !isSystemField(field) && !isComputedField(field))
    const values = Object.fromEntries(editableFields.map(field => [field.id, form[field.id] || '']))
    const timestamp = now()
    const record: DatasetRecord = { id: id('rec'), values, createdBy: account.name, createdAt: timestamp, updatedAt: timestamp }
    const nextDataset = withMutatedRecords(selectedDataset, records => [record, ...records], timestamp)
    const errors = validateDataset(nextDataset, state.qualityRules)
    if (state.settings.strictValidation && errors.length) {
      window.alert(errors.slice(0, 4).join('\n'))
      return
    }
    save(runAutomations({ ...state, datasets: state.datasets.map(dataset => dataset.id === nextDataset.id ? nextDataset : dataset) }, selectedDataset.id, 'Record created', `Record added to ${selectedDataset.name}`), 'Added record', selectedDataset.name)
    closeModal()
  }

  function createInlineRecord(name: string) {
    if (!selectedDataset) return
    const primaryField = selectedDataset.fields.find(field => field.id === 'name') || selectedDataset.fields[0]
    if (!primaryField) return
    const timestamp = now()
    const record: DatasetRecord = {
      id: id('rec'),
      values: { [primaryField.id]: name },
      createdBy: account.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const nextDataset = withMutatedRecords(selectedDataset, records => [...records, record], timestamp)
    updateDataset(nextDataset, 'Added record')
  }

  function deleteRecords(recordIds: string[]) {
    if (!selectedDataset || !recordIds.length) return
    const recordIdSet = new Set(recordIds)
    const timestamp = now()
    const nextDataset = withMutatedRecords(selectedDataset, records => records.filter(record => !recordIdSet.has(record.id)), timestamp)
    const count = recordIdSet.size
    const label = count === 1 ? 'Record deleted' : 'Records deleted'
    const detail = `${count} record${count === 1 ? '' : 's'} removed from ${selectedDataset.name}`
    save(runAutomations({ ...state, datasets: state.datasets.map(dataset => dataset.id === nextDataset.id ? nextDataset : dataset) }, selectedDataset.id, label, detail), label, selectedDataset.name)
  }

  function updateRecordValue(recordId: string, fieldId: string, value: string) {
    if (!selectedDataset) return
    const timestamp = now()
    const nextDataset = withMutatedRecords(selectedDataset, records => records.map(record => record.id === recordId ? {
      ...record,
      values: { ...record.values, [fieldId]: value },
      updatedAt: timestamp,
    } : record), timestamp)
    const errors = validateDataset(nextDataset, state.qualityRules)
    if (state.settings.strictValidation && errors.length) {
      window.alert(errors.slice(0, 4).join('\n'))
      return
    }
    save(runAutomations({ ...state, datasets: state.datasets.map(dataset => dataset.id === nextDataset.id ? nextDataset : dataset) }, selectedDataset.id, 'Record updated', `Record updated in ${selectedDataset.name}`), 'Updated record', selectedDataset.name)
  }

  function createView(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDataset) return
    const name = form.name?.trim()
    if (!name) return
    const view: DatasetView = {
      id: id('view'),
      name,
      enabled: true,
      filterFieldId: form.filterFieldId || undefined,
      filterValue: form.filterValue || undefined,
      records: [],
    }
    updateDataset({ ...selectedDataset, views: [...selectedDataset.views, view], updatedAt: now() }, 'Created view')
    setActiveViewId(view.id)
    closeModal()
  }

  function deleteView(datasetId: string, viewId: string) {
    const dataset = state.datasets.find(item => item.id === datasetId)
    if (!dataset || dataset.views.length <= 1) return
    const views = dataset.views.filter(view => view.id !== viewId)
    updateDataset({ ...dataset, views: ensureDefaultView(views), updatedAt: now() }, 'Deleted view')
    if (activeViewId === viewId) setActiveViewId(views[0]?.id || '')
  }

  function toggleView(datasetId: string, viewId: string) {
    const dataset = state.datasets.find(item => item.id === datasetId)
    if (!dataset) return
    updateDataset({ ...dataset, views: dataset.views.map(view => view.id === viewId ? { ...view, enabled: !view.enabled } : view), updatedAt: now() }, 'Updated view')
  }

  function setDefaultView(datasetId: string, viewId: string) {
    const dataset = state.datasets.find(item => item.id === datasetId)
    if (!dataset) return
    updateDataset({ ...dataset, views: dataset.views.map(view => ({ ...view, default: view.id === viewId, enabled: view.id === viewId ? true : view.enabled })), updatedAt: now() }, 'Updated default view')
    setActiveViewId(viewId)
  }

  function exportDatasetRecords(dataset: Dataset, fieldIds: string[]) {
    const selectedFields = dataset.fields.filter(field => fieldIds.includes(field.id))
    const columns = selectedFields.length ? selectedFields : dataset.fields
    const rows = dataset.records.map(record => columns.map(field => exportCellValue(record, field, dataset, state.datasets)))
    downloadExcelTable(dataset.name, [columns.map(field => field.label), ...rows])
  }

  function importDatasetRecords(dataset: Dataset, payload: string) {
    const rows = parseRows(payload)
    if (!rows.length) return false
    const fields = mergeFields(dataset.fields, rows)
    const timestamp = now()
    const records = rows.map(row => ({
      id: id('rec'),
      values: Object.fromEntries(fields.map(field => [field.id, text(row[field.key] ?? row[field.label] ?? row[field.id])])),
      createdBy: account.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
    const nextDataset = { ...dataset, fields, records: [...records, ...dataset.records], updatedAt: timestamp }
    const errors = validateDataset(nextDataset, state.qualityRules)
    if (state.settings.strictValidation && errors.length) {
      window.alert(errors.slice(0, 4).join('\n'))
      return false
    }
    save(runAutomations({ ...state, datasets: state.datasets.map(item => item.id === nextDataset.id ? nextDataset : item) }, dataset.id, 'Records imported', `${records.length} record${records.length === 1 ? '' : 's'} imported to ${dataset.name}`), 'Imported records', dataset.name)
    return true
  }

  function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name?.trim()
    if (!name) return
    const folder: FolderItem = { id: id('folder'), name, description: form.description || '', createdAt: now() }
    save({ ...state, folders: [folder, ...state.folders] }, 'Created folder', name)
    closeModal()
  }

  function createRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const relationship: Relationship = {
      id: id('rel'),
      fromDatasetId: form.fromDatasetId || selectedDataset?.id || '',
      fromFieldId: form.fromFieldId || '',
      toDatasetId: form.toDatasetId || '',
      label: form.label || 'Dataset relationship',
      createdAt: now(),
    }
    if (!relationship.fromDatasetId || !relationship.fromFieldId || !relationship.toDatasetId) return
    save({ ...state, relationships: [relationship, ...state.relationships] }, 'Created relationship', relationship.label)
    closeModal()
  }

  function createAutomation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name?.trim()
    if (!name) return
    const automation: Automation = {
      id: id('auto'),
      name,
      datasetId: form.datasetId || selectedDataset?.id || '',
      trigger: form.trigger || 'Record created',
      action: form.action || 'Create history event',
      enabled: true,
      createdAt: now(),
    }
    save({ ...state, automations: [automation, ...state.automations] }, 'Created automation', name)
    closeModal()
  }

  function createQualityRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const datasetId = form.datasetId || selectedDataset?.id || ''
    const fieldId = form.fieldId || ''
    if (!datasetId || !fieldId) return
    const rule: QualityRule = {
      id: id('rule'),
      name: form.name || `${form.type || 'Required value'} check`,
      datasetId,
      fieldId,
      type: (form.type as QualityRuleType) || 'Required value',
      enabled: true,
      createdAt: now(),
    }
    save({ ...state, qualityRules: [rule, ...state.qualityRules] }, 'Created quality rule', rule.name)
    closeModal()
  }

  function createAccessKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name?.trim()
    if (!name) return
    const key: AccessKey = {
      id: id('key'),
      name,
      scope: form.scope || 'Read datasets',
      status: 'ACTIVE',
      token: `dsk_${randomToken()}`,
      createdAt: now(),
    }
    save({ ...state, accessKeys: [key, ...state.accessKeys] }, 'Created access key', name)
    closeModal()
  }

  function deleteItem(collection: 'relationships' | 'automations' | 'qualityRules' | 'accessKeys' | 'folders', itemId: string) {
    save({ ...state, [collection]: state[collection].filter(item => item.id !== itemId) }, 'Deleted item', itemId)
  }

  function toggleAutomation(idValue: string) {
    save({ ...state, automations: state.automations.map(item => item.id === idValue ? { ...item, enabled: !item.enabled } : item) }, 'Updated automation', idValue)
  }

  function toggleRule(idValue: string) {
    save({ ...state, qualityRules: state.qualityRules.map(item => item.id === idValue ? { ...item, enabled: !item.enabled } : item) }, 'Updated quality rule', idValue)
  }

  function toggleAccessKey(idValue: string) {
    save({ ...state, accessKeys: state.accessKeys.map(item => item.id === idValue ? { ...item, status: item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : item) }, 'Updated access key', idValue)
  }

  function rotateAccessKey(idValue: string) {
    save({ ...state, accessKeys: state.accessKeys.map(item => item.id === idValue ? { ...item, token: `dsk_${randomToken()}`, createdAt: now() } : item) }, 'Rotated access key', idValue)
  }

  function importRecords(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = selectedDataset
    if (!target) return
    const rows = parseRows(form.payload || '')
    if (!rows.length) return
    const fields = mergeFields(target.fields, rows)
    const records = rows.map(row => ({
      id: id('rec'),
      values: Object.fromEntries(fields.map(field => [field.id, text(row[field.key] ?? row[field.label] ?? row[field.id])])),
      createdBy: account.name,
      createdAt: now(),
      updatedAt: now(),
    }))
    const nextDataset = { ...target, fields, records: [...records, ...target.records], updatedAt: now() }
    const errors = validateDataset(nextDataset, state.qualityRules)
    if (state.settings.strictValidation && errors.length) {
      window.alert(errors.slice(0, 4).join('\n'))
      return
    }
    save(runAutomations({ ...state, datasets: state.datasets.map(dataset => dataset.id === nextDataset.id ? nextDataset : dataset) }, target.id, 'Records imported', `${records.length} record${records.length === 1 ? '' : 's'} imported to ${target.name}`), 'Imported records', target.name)
    closeModal()
  }

  function sourceDataset(source: SourceDefinition, sourceIndex: number, rows: StoredRow[]) {
    const fields = source.fields.map(([key, label, type, required, options]) => makeField(key, label, type, required, options ? [...options] : []))
    return makeDataset({
      name: source.datasetName,
      description: `Synced from ${source.label}.`,
      folder: source.folder,
      owner: state.settings.defaultOwner || account.name,
      source: source.label,
      fields,
      records: rows.map((row, index) => ({
        id: text(row.id) || id(`src${sourceIndex}${index}`),
        values: source.map(row),
        createdBy: account.name,
        createdAt: text(row.createdAt) || now(),
        updatedAt: text(row.updatedAt) || now(),
      })).filter(record => Object.values(record.values).some(Boolean)),
    })
  }

  async function syncSource(source: SourceDefinition, sourceIndex: number) {
    setSyncingSource(source.label)
    const rows = sourceRows[source.label] || await loadSourceRows(source, companyId)
    setSourceRows(current => ({ ...current, [source.label]: rows }))
    if (!rows.length) {
      setSyncingSource('')
      if (state.settings.syncWarnings) window.alert(`No records were found in ${source.label}.`)
      return
    }

    const existing = state.datasets.find(dataset => dataset.source === source.label)
    const baseDataset = sourceDataset(source, sourceIndex, rows)
    const nextDataset = {
      ...baseDataset,
      id: existing?.id || baseDataset.id,
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    }
    save({ ...state, datasets: [nextDataset, ...state.datasets.filter(dataset => dataset.id !== existing?.id)] }, 'Synced app source', source.label)
    setSelectedDatasetId(nextDataset.id)
    setSyncingSource('')
  }

  async function syncSources() {
    setSyncingSource('all')
    const rowsBySource = Object.fromEntries(await Promise.all(sourceDefinitions.map(async source => {
      const rows = sourceRows[source.label] || await loadSourceRows(source, companyId)
      return [source.label, rows] as const
    })))
    setSourceRows(rowsBySource)
    const imported = sourceDefinitions.flatMap((source, sourceIndex) => {
      const rows = rowsBySource[source.label] || []
      return rows.length ? [sourceDataset(source, sourceIndex, rows)] : []
    })
    if (!imported.length) {
      setSyncingSource('')
      if (state.settings.syncWarnings) window.alert('No source records were found to sync yet.')
      return
    }
    const manual = state.datasets.filter(dataset => dataset.source === 'Manual')
    const existingBySource = new Map(state.datasets.filter(dataset => dataset.source !== 'Manual').map(dataset => [dataset.source, dataset.id]))
    const existingCreatedAt = new Map(state.datasets.filter(dataset => dataset.source !== 'Manual').map(dataset => [dataset.source, dataset.createdAt]))
    const synced = imported.map(dataset => ({ ...dataset, id: existingBySource.get(dataset.source) || dataset.id, createdAt: existingCreatedAt.get(dataset.source) || dataset.createdAt, updatedAt: now() }))
    save({ ...state, datasets: [...synced, ...manual] }, 'Synced app sources', `${synced.length} dataset${synced.length === 1 ? '' : 's'}`)
    setSelectedDatasetId(synced[0]?.id || manual[0]?.id || '')
    setSyncingSource('')
  }

  function updateSettings(nextSettings: WorkspaceSettings) {
    save({ ...state, settings: nextSettings }, 'Updated settings', 'Dataset workspace settings')
  }

  function renderContent() {
    if (section === 'tables') return <TablesSection datasets={filteredDatasets} selectedId={selectedDataset?.id || ''} onSelect={setSelectedDatasetId} onCreate={() => openModal('dataset')} onDelete={deleteDataset} />
    if (section === 'views') return <ViewsSection datasets={filteredDatasets} onCreate={() => openModal('view')} onToggle={toggleView} onDelete={deleteView} />
    if (section === 'imports') return <ImportsSection sources={sourceDefinitions} datasets={state.datasets} sourceRows={sourceRows} syncingSource={syncingSource} onSyncAll={() => void syncSources()} onSyncSource={(source, sourceIndex) => void syncSource(source, sourceIndex)} />
    if (section === 'relationships') return <RelationshipsSection datasets={state.datasets} relationships={state.relationships} onCreate={() => openModal('relationship')} onDelete={idValue => deleteItem('relationships', idValue)} />
    if (section === 'automations') return <AutomationsSection datasets={state.datasets} automations={state.automations} onCreate={() => openModal('automation')} onToggle={toggleAutomation} onDelete={idValue => deleteItem('automations', idValue)} />
    if (section === 'quality-rules') return <QualitySection datasets={state.datasets} rules={state.qualityRules} onCreate={() => openModal('quality')} onToggle={toggleRule} onDelete={idValue => deleteItem('qualityRules', idValue)} />
    if (section === 'access-keys') return <AccessKeysSection keys={state.accessKeys} onCreate={() => openModal('key')} onToggle={toggleAccessKey} onRotate={rotateAccessKey} onDelete={idValue => deleteItem('accessKeys', idValue)} />
    if (section === 'history') return <HistorySection events={state.history} onClear={() => save({ ...state, history: [] }, undefined)} />
    if (section === 'docs') return <DocsSection />
    if (section === 'settings') return <SettingsSectionView settings={state.settings} onChange={updateSettings} />
    if (showFoldersPage) {
      return (
        <FoldersManagementView
          folders={sidebarFolderGroups}
          query={query}
          setQuery={setQuery}
          onCreateFolder={() => openModal('folder')}
          accountName={account.name}
          accountRole={account.role}
        />
      )
    }
    if (!showDatasetDetail) {
      return (
        <DatasetManagementList
          datasets={filteredDatasets}
          query={query}
          setQuery={setQuery}
          onCreateDataset={() => openModal('dataset')}
          onChooseTemplate={() => openModal('template')}
          onOpenDataset={openDataset}
        />
      )
    }

    return (
      <OverviewSection
        stats={stats}
        datasets={filteredDatasets}
        allDatasets={state.datasets}
        selectedDataset={selectedDataset}
        activeView={activeView}
        records={filteredRecords}
        recordQuery={recordQuery}
        setRecordQuery={setRecordQuery}
        onSelectDataset={dataset => {
          setSelectedDatasetId(dataset.id)
          setActiveViewId(dataset.views.find(view => view.default)?.id || dataset.views[0]?.id || '')
        }}
        onCreateDataset={() => openModal('dataset')}
        onCreateField={() => selectedDataset && openModal('fieldPicker')}
        onCreateRecord={() => selectedDataset && openModal('record')}
        onCreateInlineRecord={createInlineRecord}
        onCreateView={() => selectedDataset && openModal('view')}
        onSelectView={setActiveViewId}
        onDeleteView={deleteView}
        onDeleteField={deleteField}
        onReorderFields={reorderFields}
        onDeleteRecords={deleteRecords}
        onUpdateRecordValue={updateRecordValue}
      />
    )
  }

  return (
    <div className="rw-app">
      <style>{styles}</style>
      <div className="rw-body">
        <aside className="rw-workspace-panel">
          <div className="rw-panel-brand">
            <span />
            <div>
              <strong>Datasets</strong>
              <small>Structured data</small>
            </div>
          </div>
          <Link href="/dashboard" className="rw-back-dashboard">
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
          <nav className="rw-panel-nav rw-simple-nav" aria-label="Datasets workspace">
            <Link href="/datasets" className={section === 'overview' && !showDatasetDetail && !showFoldersPage ? 'active' : undefined} onClick={() => {
              setShowFoldersPage(false)
              setShowDatasetDetail(false)
            }}>
              <Database size={15} />
              Datasets
            </Link>
            <Link href="/dashboard">
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
            <button type="button" className={showFoldersPage ? 'active' : undefined} onClick={() => {
              setShowFoldersPage(true)
              setShowDatasetDetail(false)
            }}>
              <Folder size={15} />
              Folders
            </button>

          </nav>
          <div className="rw-sidebar-folders" aria-label="Dataset folders">
            {sidebarFolderGroups.map(group => (
              <section key={group.name}>
                <button type="button" className="rw-sidebar-folder-head" onClick={() => {
                  setShowFoldersPage(true)
                  setShowDatasetDetail(false)
                }}>
                  <span><Folder size={14} />{group.name}</span>
                  <ChevronDown size={13} />
                </button>
                {group.datasets.map(dataset => (
                  <button
                    type="button"
                    className={selectedDatasetId === dataset.id && showDatasetDetail ? 'active' : undefined}
                    key={dataset.id}
                    onClick={() => openDataset(dataset.id)}
                  >
                    <b>{dataset.name.slice(0, 1).toUpperCase()}</b>
                    {dataset.name}
                  </button>
                ))}
              </section>
            ))}
          </div>
        </aside>
        <main className="rw-main">
          <header className="rw-topbar">
            <div className="rw-top-left">
              <span className="rw-product-mark"><Grid2X2 size={17} /></span>
              <div><strong>Datasets</strong><small>Structured workspace data</small></div>
            </div>
            <label className="rw-global-search">
              <Search size={17} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search datasets" />
            </label>
            <div className="rw-top-actions">
              <CompanySwitcher compact />
              <button type="button" className="rw-notification" aria-label="Notifications"><Bell size={18} /><em>14</em></button>
              <button type="button" className="rw-top-secondary" onClick={() => openModal('template')}><FileSpreadsheet size={15} /> Choose template</button>
              <button type="button" className="rw-top-primary" onClick={() => openModal('dataset')}><Plus size={15} /> New dataset</button>
              <span>{initials(account.name).slice(0, 2)}</span>
            </div>
          </header>

          {renderContent()}
        </main>
      </div>

      {modal && (
        <Modal title={modal === 'fieldPicker' && selectedDataset ? selectedDataset.name : modalTitle(modal)} onClose={closeModal} wide={modal === 'fieldPicker' || modal === 'field'} variant={modal}>
          {modal === 'dataset' && <DatasetForm form={form} setForm={setForm} onSubmit={createDataset} onCancel={closeModal} settings={state.settings} accountName={account.name} folderOptions={Array.from(new Set([...state.folders.map(folder => folder.name), ...state.datasets.map(dataset => dataset.folder || 'Uncategorized')])).filter(Boolean)} />}
          {modal === 'template' && <TemplateChooser hasClientImportTemplate={state.datasets.some(isClientImportTemplateDataset)} onUseClientImportTemplate={applyClientImportTemplate} />}
          {modal === 'fieldPicker' && selectedDataset && (
            <AddFieldsPicker
              activeTab={addFieldTab}
              setActiveTab={setAddFieldTab}
              dataset={selectedDataset}
              datasets={state.datasets}
              folderOptions={Array.from(new Set([...state.folders.map(folder => folder.name), ...state.datasets.map(dataset => dataset.folder || 'Uncategorized')])).filter(Boolean)}
              accountName={account.name}
              onStartField={startField}
              onCopyField={copyExistingField}
              onUpdateDataset={nextDataset => updateDataset(nextDataset, 'Updated dataset settings')}
              onApplyClientTemplate={nextDataset => updateDataset(nextDataset, 'Applied client import template')}
              onToggleView={toggleView}
              onSetDefaultView={setDefaultView}
              onDeleteView={deleteView}
              onExport={exportDatasetRecords}
              onImport={importDatasetRecords}
            />
          )}
          {modal === 'field' && selectedDataset && <FieldForm form={form} setForm={setForm} onSubmit={createField} dataset={selectedDataset} datasets={state.datasets} />}
          {modal === 'record' && selectedDataset && <RecordForm dataset={selectedDataset} datasets={state.datasets} form={form} setForm={setForm} onSubmit={createRecord} onCancel={closeModal} accountName={account.name} clientChoices={clientChoices} />}
          {modal === 'view' && selectedDataset && <ViewForm dataset={selectedDataset} form={form} setForm={setForm} onSubmit={createView} />}
          {modal === 'import' && selectedDataset && <ImportForm dataset={selectedDataset} form={form} setForm={setForm} onSubmit={importRecords} />}
          {modal === 'relationship' && <RelationshipForm datasets={state.datasets} form={form} setForm={setForm} onSubmit={createRelationship} />}
          {modal === 'automation' && <AutomationForm datasets={state.datasets} form={form} setForm={setForm} onSubmit={createAutomation} />}
          {modal === 'quality' && <QualityForm datasets={state.datasets} form={form} setForm={setForm} onSubmit={createQualityRule} />}
          {modal === 'key' && <AccessKeyForm form={form} setForm={setForm} onSubmit={createAccessKey} />}
          {modal === 'folder' && <FolderForm form={form} setForm={setForm} onSubmit={createFolder} />}
        </Modal>
      )}
    </div>
  )
}

function DatasetManagementList({
  datasets,
  query,
  setQuery,
  onCreateDataset,
  onChooseTemplate,
  onOpenDataset,
}: {
  datasets: Dataset[]
  query: string
  setQuery: (value: string) => void
  onCreateDataset: () => void
  onChooseTemplate: () => void
  onOpenDataset: (datasetId: string) => void
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [referenceTime] = useState(() => Date.now())

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  const totalDatasets = datasets.length
  const activeDatasets = datasets.filter(dataset => dataset.status === 'ACTIVE').length
  const ownerSet = new Set<string>()
  datasets.forEach(dataset => {
    if (dataset.owner) ownerSet.add(dataset.owner)
    ;(dataset.owners || []).forEach(owner => owner && ownerSet.add(owner))
  })
  const recentlyUpdated = datasets.filter(dataset => {
    const stamp = new Date(dataset.updatedAt || dataset.createdAt).getTime()
    return Number.isFinite(stamp) && referenceTime - stamp < thirtyDaysMs
  }).length

  const stats: StatTile[] = [
    { key: 'total', tone: 'green', icon: <Database size={18} />, value: totalDatasets, label: 'Total datasets', hint: 'Across all folders' },
    { key: 'active', tone: 'blue', icon: <FileSpreadsheet size={18} />, value: activeDatasets, label: 'Active datasets', hint: 'Currently in use' },
    { key: 'owners', tone: 'purple', icon: <Users size={18} />, value: ownerSet.size, label: 'Owners', hint: 'Users with access' },
    { key: 'recent', tone: 'orange', icon: <CalendarDays size={18} />, value: recentlyUpdated, label: 'Recent updates', hint: 'In the last 30 days' },
  ]

  const totalPages = Math.max(1, Math.ceil(datasets.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const visibleDatasets = datasets.slice(pageStart, pageStart + pageSize)

  return (
    <section className="rw-management-page rw-datasets-management-page rw-mgmt">
      <header className="rw-mgmt-header">
        <div className="rw-mgmt-title">
          <h1>Datasets management</h1>
          <p>View, organize and manage your datasets.</p>
        </div>
        <div className="rw-mgmt-actions">
          <label className="rw-mgmt-search">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Quick find" />
            <Search size={15} />
          </label>
          <button type="button" className="rw-mgmt-filter">
            <Filter size={14} /> Filter
          </button>
          <button type="button" className="rw-mgmt-template" onClick={onChooseTemplate}>
            <FileSpreadsheet size={15} /> Choose template
          </button>
          <button type="button" className="rw-mgmt-create" onClick={onCreateDataset}>
            <Plus size={15} /> Create dataset
          </button>
        </div>
      </header>

      <div className="rw-mgmt-stats">
        {stats.map(stat => (
          <article key={stat.key} className={`rw-mgmt-stat tone-${stat.tone}`}>
            <span className="rw-mgmt-stat-icon">{stat.icon}</span>
            <div className="rw-mgmt-stat-body">
              <div className="rw-mgmt-stat-value">{stat.value}</div>
              <div className="rw-mgmt-stat-label">{stat.label}</div>
            </div>
            <div className="rw-mgmt-stat-foot">
              <span>{stat.hint}</span>
              <Sparkline tone={stat.tone} seed={stat.value + stat.key.length} />
            </div>
          </article>
        ))}
      </div>

      {datasets.length > 0 && (
        <section className="rw-mgmt-pinned">
          <header>
            <div>
              <h2>Pinned datasets</h2>
              <p>Your most recently updated workspaces.</p>
            </div>
            <button type="button" className="rw-mgmt-link-btn">View all</button>
          </header>
          <div className="rw-mgmt-pinned-strip">
            {[...datasets]
              .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
              .slice(0, 4)
              .map((dataset, index) => {
                const tone = ['gold', 'red', 'teal', 'violet'][index % 4]
                const records = dataset.records.length
                const fields = dataset.fields.length
                return (
                  <button
                    type="button"
                    key={dataset.id}
                    className={`rw-mgmt-pin-card tone-${tone}`}
                    onClick={() => onOpenDataset(dataset.id)}
                  >
                    <span className="rw-mgmt-pin-icon"><Grid2X2 size={16} /></span>
                    <span className="rw-mgmt-pin-folder">{dataset.folder || 'Uncategorized'}</span>
                    <strong>{dataset.name}</strong>
                    <span className="rw-mgmt-pin-meta">
                      <em>{records} {records === 1 ? 'record' : 'records'}</em>
                      <i />
                      <em>{fields} {fields === 1 ? 'field' : 'fields'}</em>
                    </span>
                  </button>
                )
              })}
          </div>
        </section>
      )}

      <div className="rw-mgmt-main">
      <div className="rw-mgmt-table-card">
        <div className="rw-mgmt-table-row head">
          <span className="cell-check"><input type="checkbox" aria-label="Select all" readOnly /></span>
          <span>Dataset</span>
          <span>Status</span>
          <span>Owners</span>
          <span>Last updated</span>
          <span className="cell-actions">Actions</span>
        </div>
        {visibleDatasets.map((dataset, index) => {
          const updatedAt = new Date(dataset.updatedAt || dataset.createdAt)
          const validDate = !Number.isNaN(updatedAt.getTime())
          const dateText = validDate
            ? updatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'
          const timeText = validDate
            ? updatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            : ''
          const ownerLabel = dataset.owner || 'Unassigned'
          const ownerInitial = (initials(ownerLabel) || '?').slice(0, 1)
          const datasetIdShort = dataset.id ? dataset.id.slice(0, 8).toUpperCase() : ''
          return (
            <button type="button" className="rw-mgmt-table-row" key={dataset.id} onClick={() => onOpenDataset(dataset.id)}>
              <span className="cell-check"><input type="checkbox" onClick={event => event.stopPropagation()} readOnly /></span>
              <span className="cell-dataset">
                <b className={index % 2 ? 'red' : 'gold'}><Grid2X2 size={16} /></b>
                <span className="cell-dataset-text">
                  <strong>{dataset.name}</strong>
                  <small>
                    {dataset.description || 'No description'}
                    {datasetIdShort && <em className="rw-id-chip">ID: {datasetIdShort}</em>}
                  </small>
                </span>
              </span>
              <span className="cell-status">
                <span className={`rw-status-pill ${dataset.status === 'ACTIVE' ? 'active' : 'paused'}`}>
                  <i /> {dataset.status === 'ACTIVE' ? 'Active' : 'Paused'}
                </span>
              </span>
              <span className="cell-owner">
                <i>{ownerInitial}</i>
                <span>
                  <strong>{ownerLabel}</strong>
                  <small>Owner</small>
                </span>
              </span>
              <span className="cell-date">
                <strong>{dateText}</strong>
                {timeText && <small>{timeText}</small>}
              </span>
              <span className="cell-actions" onClick={event => event.stopPropagation()}>
                <MoreHorizontal size={18} />
              </span>
            </button>
          )
        })}
        {!visibleDatasets.length && (
          <div className="rw-mgmt-empty">
            <EmptyState icon={<Database size={34} />} title="No datasets yet" detail="Create a dataset first, then click it to add fields." action="Create dataset" onAction={onCreateDataset} />
          </div>
        )}

        <footer className="rw-mgmt-table-foot">
          <span className="rw-mgmt-count">
            Showing {datasets.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + pageSize, datasets.length)} of {datasets.length} dataset{datasets.length === 1 ? '' : 's'}
          </span>
          <div className="rw-mgmt-pagination">
            <button
              type="button"
              className="rw-mgmt-page-nav"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <button type="button" className="rw-mgmt-page-current">{safePage}</button>
            <button
              type="button"
              className="rw-mgmt-page-nav"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <label className="rw-mgmt-page-size">
            <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </footer>
      </div>

      <aside className="rw-mgmt-activity">
        <header>
          <div>
            <h2>Recent activity</h2>
            <p>Latest changes across your datasets.</p>
          </div>
          <button type="button" className="rw-mgmt-link-btn">View all</button>
        </header>
        {datasets.length === 0 ? (
          <div className="rw-mgmt-activity-empty">
            <Activity size={24} />
            <strong>No activity yet</strong>
            <span>Create your first dataset to see updates here.</span>
          </div>
        ) : (
          <ul className="rw-mgmt-activity-list">
            {[...datasets]
              .flatMap(dataset => {
                const created = new Date(dataset.createdAt)
                const updated = new Date(dataset.updatedAt || dataset.createdAt)
                const sameStamp = created.getTime() === updated.getTime()
                const items: ActivityItem[] = [
                  { id: `${dataset.id}-created`, datasetId: dataset.id, datasetName: dataset.name, action: 'created', actor: dataset.owner || 'Workspace', timestamp: created },
                ]
                if (!sameStamp) {
                  items.push({ id: `${dataset.id}-updated`, datasetId: dataset.id, datasetName: dataset.name, action: 'updated', actor: dataset.owner || 'Workspace', timestamp: updated })
                }
                return items
              })
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .slice(0, 6)
              .map(item => (
                <li
                  key={item.id}
                  className="rw-mgmt-activity-item"
                  onClick={() => onOpenDataset(item.datasetId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    onOpenDataset(item.datasetId)
                  }}
                >
                  <span className={`rw-mgmt-activity-dot tone-${item.action === 'created' ? 'green' : 'blue'}`}>
                    {item.action === 'created' ? <Plus size={12} /> : <Pencil size={12} />}
                  </span>
                  <div>
                    <p>
                      <strong>{item.actor}</strong> {item.action} <em>{item.datasetName}</em>
                    </p>
                    <small>{relativeTime(item.timestamp)}</small>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </aside>
      </div>
    </section>
  )
}

type ActivityItem = {
  id: string
  datasetId: string
  datasetName: string
  action: 'created' | 'updated'
  actor: string
  timestamp: Date
}

function relativeTime(date: Date) {
  const delta = Date.now() - date.getTime()
  if (!Number.isFinite(delta) || delta < 0) return 'Just now'
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (delta < minute) return 'Just now'
  if (delta < hour) {
    const n = Math.floor(delta / minute)
    return `${n} min${n === 1 ? '' : 's'} ago`
  }
  if (delta < day) {
    const n = Math.floor(delta / hour)
    return `${n} hr${n === 1 ? '' : 's'} ago`
  }
  if (delta < 7 * day) {
    const n = Math.floor(delta / day)
    return `${n} day${n === 1 ? '' : 's'} ago`
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type StatTone = 'green' | 'blue' | 'purple' | 'orange'
type StatTile = {
  key: string
  tone: StatTone
  icon: ReactNode
  value: number
  label: string
  hint: string
}

function Sparkline({ tone, seed }: { tone: StatTone; seed: number }) {
  // Deterministic pseudo-random sequence so each tile renders a stable shape.
  const points = useMemo(() => {
    const values: number[] = []
    let cursor = (seed || 1) * 9973
    for (let index = 0; index < 12; index += 1) {
      cursor = (cursor * 1103515245 + 12345) & 0x7fffffff
      values.push((cursor % 1000) / 1000)
    }
    return values
  }, [seed])

  const width = 72
  const height = 22
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const stroke = tone === 'green' ? '#22c55e' : tone === 'blue' ? '#3b82f6' : tone === 'purple' ? '#8b5cf6' : '#f59e0b'

  return (
    <svg className="rw-mgmt-stat-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FoldersManagementView({
  folders,
  query,
  setQuery,
  onCreateFolder,
  accountName,
  accountRole,
}: {
  folders: FolderGroup[]
  query: string
  setQuery: (value: string) => void
  onCreateFolder: () => void
  accountName: string
  accountRole: string
}) {
  const needle = query.trim().toLowerCase()
  const visibleFolders = folders.filter(folder => !needle || [folder.name, folder.description, ...folder.datasets.map(dataset => dataset.name)].join(' ').toLowerCase().includes(needle))

  return (
    <section className="rw-folders-page">
      <header className="rw-management-header">
        <div className="rw-management-title">
          <Folder size={26} />
          <div>
            <h1>Folders management</h1>
            <p>Manage folders</p>
          </div>
        </div>
        <div className="rw-management-actions">
          <label>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Quick find" />
            <Search size={15} />
          </label>
          <button type="button" onClick={onCreateFolder}>Create</button>
        </div>
      </header>

      <div className="rw-folder-list-card">
        <div className="rw-folder-list-row head">
          <span>FOLDER NAME</span>
          <span>CREATOR</span>
          <span aria-hidden="true" />
        </div>
        {visibleFolders.map(folder => (
          <div className="rw-folder-list-row" key={folder.id}>
            <div className="folder-name">
              <Folder size={30} />
              <div>
                <strong>{folder.name}</strong>
                <small>{folder.datasets.length} dataset{folder.datasets.length === 1 ? '' : 's'} - {folder.description || folder.datasets.map(dataset => dataset.name).join(', ') || 'No description'}</small>
              </div>
            </div>
            <div className="folder-creator">
              <i>{initials(accountName).slice(0, 1)}</i>
              <div>
                <strong>{accountName}</strong>
                <small>{accountRole}</small>
              </div>
            </div>
            <button type="button" aria-label={`More actions for ${folder.name}`}>
              <MoreHorizontal size={18} />
            </button>
          </div>
        ))}
        {!visibleFolders.length && (
          <div className="rw-folder-empty">
            <Folder size={34} />
            <strong>No folders yet</strong>
            <span>Create a folder to organize datasets.</span>
          </div>
        )}
      </div>
    </section>
  )
}

function FilterIcon() {
  return <span className="rw-tool-glyph" aria-hidden="true">=</span>
}

function SortIcon() {
  return <span className="rw-tool-glyph" aria-hidden="true">^v</span>
}

function OverviewSection(props: {
  stats: { datasets: number; records: number; fields: number; views: number; quality: number }
  datasets: Dataset[]
  allDatasets: Dataset[]
  selectedDataset?: Dataset
  activeView?: DatasetView
  records: DatasetRecord[]
  recordQuery: string
  setRecordQuery: (value: string) => void
  onSelectDataset: (dataset: Dataset) => void
  onCreateDataset: () => void
  onCreateField: () => void
  onCreateRecord: () => void
  onCreateInlineRecord: (name: string) => void
  onCreateView: () => void
  onSelectView: (viewId: string) => void
  onDeleteView: (datasetId: string, viewId: string) => void
  onDeleteField: (fieldId: string) => void
  onReorderFields: (draggedFieldId: string, targetFieldId: string) => void
  onDeleteRecords: (recordIds: string[]) => void
  onUpdateRecordValue: (recordId: string, fieldId: string, value: string) => void
}) {
  const selectedDataset = props.selectedDataset
  const [rowHeight, setRowHeight] = useState<RowHeightOption>('Extra Tall')
  const [rowHeightOpen, setRowHeightOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [sortFieldId, setSortFieldId] = useState('')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])

  const visibleRecords = useMemo(() => {
    if (!selectedDataset) return props.records
    return applyFilterRules(props.records, selectedDataset, props.allDatasets, filterRules)
  }, [filterRules, props.allDatasets, props.records, selectedDataset])

  const sortedRecords = useMemo(() => {
    if (!selectedDataset || !sortFieldId) return visibleRecords
    const field = selectedDataset.fields.find(item => item.id === sortFieldId)
    if (!field) return visibleRecords
    return [...visibleRecords].sort((left, right) => compareRecordValues(left, right, field, selectedDataset, props.allDatasets, sortDirection))
  }, [props.allDatasets, selectedDataset, sortDirection, sortFieldId, visibleRecords])

  return (
    <section className="rw-dataset-screen">
      {selectedDataset ? (
        <>
          <header className="rw-dataset-detail-header">
            <div className="rw-dataset-detail-title">
              <b><Grid2X2 size={18} /></b>
              <h1>{selectedDataset.name}</h1>
            </div>
            <div className="rw-dataset-detail-actions">
              <button type="button">{props.records.length} record{props.records.length === 1 ? '' : 's'}</button>
              <label>
                <input value={props.recordQuery} onChange={event => props.setRecordQuery(event.target.value)} placeholder="Enter to search records" />
                <Search size={15} />
              </label>
              <button type="button" className="primary" onClick={props.onCreateRecord}><Plus size={15} /> Create <ChevronDown size={13} /></button>
              <button type="button" aria-label="More dataset actions"><MoreHorizontal size={18} /></button>
            </div>
          </header>
          <div className="rw-viewbar">
            {selectedDataset.views.map(view => (
              <button className={props.activeView?.id === view.id ? 'active' : ''} type="button" key={view.id} onClick={() => props.onSelectView(view.id)}>
                <Table2 size={14} />{view.name}
                {!view.default && selectedDataset.views.length > 1 && (
                  <span
                    className="view-delete"
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete ${view.name} view`}
                    onClick={event => {
                      event.stopPropagation()
                      props.onDeleteView(selectedDataset.id, view.id)
                    }}
                    onKeyDown={event => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      event.stopPropagation()
                      props.onDeleteView(selectedDataset.id, view.id)
                    }}
                  >
                    <X size={12} />
                  </span>
                )}
              </button>
            ))}
            <button type="button" onClick={props.onCreateView}><Plus size={14} />Create</button>
            <button type="button">Settings</button>
          </div>
          <div className="rw-grid-actions">
            <button type="button" onClick={props.onCreateField}><AlignLeft size={14} /> Manage fields</button>
            <div className="rw-row-height-control">
              <button type="button" className="active" onClick={() => setRowHeightOpen(!rowHeightOpen)}><Activity size={14} /> Row height <X size={12} /></button>
              {rowHeightOpen && (
                <div className="rw-row-height-menu">
                  {(['Short', 'Medium', 'Tall', 'Extra Tall'] as RowHeightOption[]).map(option => (
                    <button type="button" key={option} onClick={() => {
                      setRowHeight(option)
                      setRowHeightOpen(false)
                    }}>
                      {option}
                      {rowHeight === option && <CheckSquare size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedDataset && <FilterControl dataset={selectedDataset} isOpen={filterOpen} setIsOpen={setFilterOpen} rules={filterRules} setRules={setFilterRules} />}
            {selectedDataset && (
              <SortControl
                dataset={selectedDataset}
                isOpen={sortOpen}
                setIsOpen={setSortOpen}
                selectedFieldId={sortFieldId}
                setSelectedFieldId={setSortFieldId}
                direction={sortDirection}
                setDirection={setSortDirection}
              />
            )}
            <button type="button"><Users size={14} /> Group by: None</button>
          </div>
          <RecordsTable dataset={selectedDataset} datasets={props.allDatasets} records={sortedRecords} rowHeight={rowHeight} onCreateField={props.onCreateField} onCreateRecord={props.onCreateInlineRecord} onDeleteField={props.onDeleteField} onReorderFields={props.onReorderFields} onDeleteRecords={props.onDeleteRecords} onUpdateRecordValue={props.onUpdateRecordValue} />
        </>
      ) : (
        <EmptyState icon={<FileSpreadsheet size={34} />} title="No dataset selected" detail="Create a dataset or sync real records from another WiseFlow app." action="Create dataset" onAction={props.onCreateDataset} />
      )}
      {!selectedDataset && (
        <aside className="rw-bottom-status">
          <Metric icon={<Database size={19} />} label="Datasets" value={props.stats.datasets} />
          <Metric icon={<Table2 size={19} />} label="Records" value={props.stats.records} />
          <Metric icon={<Grid2X2 size={19} />} label="Views" value={props.stats.views} />
          <Metric icon={<ShieldCheck size={19} />} label="Quality" value={`${props.stats.quality}%`} />
        </aside>
      )}
    </section>
  )
}

function TablesSection({ datasets, selectedId, onSelect, onCreate, onDelete }: { datasets: Dataset[]; selectedId: string; onSelect: (id: string) => void; onCreate: () => void; onDelete: (id: string) => void }) {
  return (
    <section className="rw-card">
      <header><h2>Dataset tables</h2><button type="button" className="primary" onClick={onCreate}><Plus size={15} /> New table</button></header>
      {datasets.length ? <table><thead><tr><th>Name</th><th>Folder</th><th>Owner</th><th>Source</th><th>Records</th><th>Fields</th><th>Status</th><th /></tr></thead><tbody>{datasets.map(dataset => <tr key={dataset.id} className={dataset.id === selectedId ? 'selected' : ''}><td><button type="button" className="link-button" onClick={() => onSelect(dataset.id)}>{dataset.name}<small>{dataset.description || 'No description'}</small></button></td><td>{dataset.folder}</td><td>{dataset.owner}</td><td>{dataset.source}</td><td>{dataset.records.length}</td><td>{dataset.fields.length}</td><td>{dataset.status}</td><td><button type="button" className="danger" onClick={() => onDelete(dataset.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table> : <EmptyState icon={<Table2 size={34} />} title="No tables yet" detail="Create your first dataset table to start storing records." action="New table" onAction={onCreate} /> }
    </section>
  )
}

function ViewsSection({ datasets, onCreate, onToggle, onDelete }: { datasets: Dataset[]; onCreate: () => void; onToggle: (datasetId: string, viewId: string) => void; onDelete: (datasetId: string, viewId: string) => void }) {
  const views = datasets.flatMap(dataset => dataset.views.map(view => ({ dataset, view })))
  return <section className="rw-grid-cards">{views.map(({ dataset, view }) => <article className="rw-mini-card" key={`${dataset.id}-${view.id}`}><Grid2X2 size={22} /><h3>{view.name}</h3><p>{dataset.name}</p><small>{view.filterFieldId ? 'Filtered view' : 'All records'}</small><footer><button type="button" onClick={() => onToggle(dataset.id, view.id)}>{view.enabled ? 'Disable' : 'Enable'}</button><button type="button" className="danger" onClick={() => onDelete(dataset.id, view.id)}><Trash2 size={15} /></button></footer></article>)}{!views.length && <EmptyState icon={<Grid2X2 size={34} />} title="No views yet" detail="Create a dataset first, then save filtered views." action="Create view" onAction={onCreate} />}<button type="button" className="rw-create-tile" onClick={onCreate}><Plus size={20} /> Create view</button></section>
}

function ImportsSection({
  sources,
  datasets,
  sourceRows,
  syncingSource,
  onSyncAll,
  onSyncSource,
}: {
  sources: SourceDefinition[]
  datasets: Dataset[]
  sourceRows: Record<string, StoredRow[]>
  syncingSource: string
  onSyncAll: () => void
  onSyncSource: (source: SourceDefinition, sourceIndex: number) => void
}) {
  const hasRows = sources.some(source => (sourceRows[source.label] || []).length > 0)

  return (
    <section className="rw-card rw-source-syncs">
      <header>
        <div>
          <h2>Source syncs</h2>
          <p>Sync app module records into managed dataset tables.</p>
        </div>
        <button type="button" className="primary" onClick={onSyncAll} disabled={syncingSource === 'all'}>
          <RefreshCw size={15} /> {syncingSource === 'all' ? 'Syncing...' : 'Sync all sources'}
        </button>
      </header>

      <div className="rw-source-sync-head">
        <span>Source module</span>
        <span>Target dataset</span>
        <span>Available records</span>
        <span>Last synced</span>
        <span>Status</span>
        <span />
      </div>

      {sources.map((source, sourceIndex) => {
        const rows = sourceRows[source.label] || []
        const syncedDataset = datasets.find(dataset => dataset.source === source.label)
        const status = !rows.length ? 'No records' : syncedDataset ? 'Synced' : 'Ready'
        return (
          <div className="rw-source-sync-row" key={source.label}>
            <div>
              <strong>{source.label}</strong>
              <p>{source.storageKeys.join(', ')}</p>
            </div>
            <span>{source.datasetName}</span>
            <span>{rows.length} row{rows.length === 1 ? '' : 's'}</span>
            <span>{syncedDataset ? formatDate(syncedDataset.updatedAt) : '-'}</span>
            <em className={`sync-${slugify(status)}`}>{status}</em>
            <button type="button" disabled={!rows.length || syncingSource === source.label || syncingSource === 'all'} onClick={() => onSyncSource(source, sourceIndex)}>
              <RefreshCw size={14} /> {syncingSource === source.label ? 'Syncing...' : 'Sync to dataset'}
            </button>
          </div>
        )
      })}

      {!hasRows && (
        <div className="rw-source-sync-empty">
          <UploadCloud size={24} />
          <strong>No source records found yet</strong>
          <span>Add records in Client Database, Supplier Database, HR Employees, or Warehouse Inventory, then return here to sync them into datasets.</span>
        </div>
      )}
    </section>
  )
}

function RelationshipsSection({ datasets, relationships, onCreate, onDelete }: { datasets: Dataset[]; relationships: Relationship[]; onCreate: () => void; onDelete: (id: string) => void }) {
  return <section className="rw-card"><header><h2>Relationships</h2><button type="button" className="primary" onClick={onCreate}><Plus size={15} /> New relationship</button></header>{relationships.map(item => <div className="rw-line" key={item.id}><Link2 size={18} /><div><strong>{item.label}</strong><p>{nameOf(datasets, item.fromDatasetId)} / {fieldNameOf(datasets, item.fromDatasetId, item.fromFieldId)} links to {nameOf(datasets, item.toDatasetId)}</p></div><button type="button" className="danger" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div>)}{!relationships.length && <EmptyState icon={<Link2 size={34} />} title="No relationships yet" detail="Create linked-record relationships between datasets." action="New relationship" onAction={onCreate} />}</section>
}

function AutomationsSection({ datasets, automations, onCreate, onToggle, onDelete }: { datasets: Dataset[]; automations: Automation[]; onCreate: () => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return <section className="rw-card"><header><h2>Automations</h2><button type="button" className="primary" onClick={onCreate}><Plus size={15} /> New automation</button></header>{automations.map(item => <div className="rw-line" key={item.id}><Workflow size={18} /><div><strong>{item.name}</strong><p>{nameOf(datasets, item.datasetId)} - {item.trigger} - {item.action}</p></div><button type="button" onClick={() => onToggle(item.id)}>{item.enabled ? 'Running' : 'Paused'}</button><button type="button" className="danger" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div>)}{!automations.length && <EmptyState icon={<Workflow size={34} />} title="No automations yet" detail="Create automation rules that respond to dataset changes." action="New automation" onAction={onCreate} />}</section>
}

function QualitySection({ datasets, rules, onCreate, onToggle, onDelete }: { datasets: Dataset[]; rules: QualityRule[]; onCreate: () => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return <section className="rw-card"><header><h2>Quality rules</h2><button type="button" className="primary" onClick={onCreate}><Plus size={15} /> New rule</button></header>{datasets.map(dataset => <div className="rw-quality" key={dataset.id}><div><strong>{dataset.name}</strong><p>{qualityScore(dataset, rules)}% quality score</p></div><Progress value={qualityScore(dataset, rules)} /></div>)}{rules.map(item => <div className="rw-line" key={item.id}><ShieldCheck size={18} /><div><strong>{item.name}</strong><p>{nameOf(datasets, item.datasetId)} - {fieldNameOf(datasets, item.datasetId, item.fieldId)} - {item.type}</p></div><button type="button" onClick={() => onToggle(item.id)}>{item.enabled ? 'Enabled' : 'Disabled'}</button><button type="button" className="danger" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></div>)}{!rules.length && <EmptyState icon={<ShieldCheck size={34} />} title="No custom rules yet" detail="Required fields still count automatically. Add custom checks for stricter data quality." action="New rule" onAction={onCreate} />}</section>
}

function AccessKeysSection({ keys, onCreate, onToggle, onRotate, onDelete }: { keys: AccessKey[]; onCreate: () => void; onToggle: (id: string) => void; onRotate: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <section className="rw-card">
      <header><h2>Access keys</h2><button type="button" className="primary" onClick={onCreate}><Plus size={15} /> New key</button></header>
      <div className="rw-security-note"><ShieldCheck size={18} /><span>Security review: tokens are masked in the UI, copy requires an explicit action, paused keys cannot be used by integrations, and rotation issues a fresh token.</span></div>
      {keys.map(key => (
        <div className="rw-line" key={key.id}>
          <LockKeyhole size={18} />
          <div><strong>{key.name}</strong><p>{maskAccessToken(key.token)} - {key.scope} - Created {formatDateOnly(key.createdAt)}</p></div>
          <button type="button" onClick={() => navigator.clipboard?.writeText(key.token)}><Copy size={15} /> Copy</button>
          <button type="button" onClick={() => onRotate(key.id)}><RefreshCw size={15} /> Rotate</button>
          <button type="button" onClick={() => onToggle(key.id)}>{key.status}</button>
          <button type="button" className="danger" onClick={() => onDelete(key.id)}><Trash2 size={15} /></button>
        </div>
      ))}
      {!keys.length && <EmptyState icon={<KeyRound size={34} />} title="No access keys yet" detail="Create keys only when another internal tool needs dataset access." action="New key" onAction={onCreate} />}
    </section>
  )
}

function HistorySection({ events, onClear }: { events: HistoryEvent[]; onClear: () => void }) {
  return <section className="rw-card"><header><h2>History</h2><button type="button" onClick={onClear}>Clear history</button></header>{events.map(event => <div className="rw-line" key={event.id}><Activity size={18} /><div><strong>{event.action}</strong><p>{event.detail || 'No detail'} - {formatDate(event.createdAt)}</p></div></div>)}{!events.length && <EmptyState icon={<Activity size={34} />} title="No history yet" detail="Dataset actions will appear here when audit history is enabled." />}</section>
}

function DocsSection() {
  return <section className="rw-grid-cards">{['Create tables for business objects, not individual reports.', 'Use required fields for values that workflows depend on.', 'Use views to save filtered worklists without copying records.', 'Use relationships when one dataset should reference another.', 'Use imports to bring existing module records into datasets.'].map((textValue, index) => <article className="rw-mini-card" key={textValue}><ListChecks size={22} /><h3>Guide {index + 1}</h3><p>{textValue}</p></article>)}</section>
}

function SettingsSectionView({ settings, onChange }: { settings: WorkspaceSettings; onChange: (settings: WorkspaceSettings) => void }) {
  return <section className="rw-card settings-card"><header><h2>Settings</h2></header><Toggle label="Strict validation" detail="Block records with missing required fields." checked={settings.strictValidation} onChange={value => onChange({ ...settings, strictValidation: value })} /><Toggle label="Audit history" detail="Track dataset changes in History." checked={settings.auditHistory} onChange={value => onChange({ ...settings, auditHistory: value })} /><Toggle label="Sync warnings" detail="Warn when app sources do not contain records." checked={settings.syncWarnings} onChange={value => onChange({ ...settings, syncWarnings: value })} /><label className="rw-form-line">Default owner<input value={settings.defaultOwner} onChange={event => onChange({ ...settings, defaultOwner: event.target.value })} placeholder="Current user" /></label></section>
}

function SortControl({
  dataset,
  isOpen,
  setIsOpen,
  selectedFieldId,
  setSelectedFieldId,
  direction,
  setDirection,
}: {
  dataset: Dataset
  isOpen: boolean
  setIsOpen: (value: boolean) => void
  selectedFieldId: string
  setSelectedFieldId: (value: string) => void
  direction: SortDirection
  setDirection: (value: SortDirection) => void
}) {
  const [query, setQuery] = useState('')
  const [draftFieldId, setDraftFieldId] = useState(selectedFieldId)
  const [draftDirection, setDraftDirection] = useState<SortDirection>(direction)
  const fields = dataset.fields.filter(field => [field.label, field.type].join(' ').toLowerCase().includes(query.toLowerCase()))

  function close() {
    setDraftFieldId(selectedFieldId)
    setDraftDirection(direction)
    setIsOpen(false)
  }

  return (
    <div className="rw-sort-control">
      <button type="button" onClick={() => {
        setDraftFieldId(selectedFieldId)
        setDraftDirection(direction)
        setIsOpen(!isOpen)
      }}><SortIcon /> Sort</button>
      {isOpen && (
        <div className="rw-sort-popover">
          <header><h3>Sort</h3><button type="button" aria-label="Close sort" onClick={close}><X size={15} /></button></header>
          <label className="rw-sort-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search field" autoFocus /></label>
          <div className="rw-sort-fields">
            {fields.map(field => (
              <button type="button" className={draftFieldId === field.id ? 'active' : undefined} key={field.id} onClick={() => setDraftFieldId(field.id)}>
                {iconForType(field.type)}
                <span>{field.label}</span>
                {draftFieldId === field.id && <CheckSquare size={14} />}
              </button>
            ))}
          </div>
          <div className="rw-sort-direction">
            <button type="button" className={draftDirection === 'asc' ? 'active' : undefined} onClick={() => setDraftDirection('asc')}>A to Z</button>
            <button type="button" className={draftDirection === 'desc' ? 'active' : undefined} onClick={() => setDraftDirection('desc')}>Z to A</button>
          </div>
          <footer><button type="button" onClick={close}>Cancel</button><button type="button" className="primary" onClick={() => {
            setSelectedFieldId(draftFieldId)
            setDirection(draftDirection)
            setIsOpen(false)
          }}>Okay</button></footer>
        </div>
      )}
    </div>
  )
}

function FilterControl({ dataset, isOpen, setIsOpen, rules, setRules }: { dataset: Dataset; isOpen: boolean; setIsOpen: (value: boolean) => void; rules: FilterRule[]; setRules: (rules: FilterRule[]) => void }) {
  const [draftRules, setDraftRules] = useState<FilterRule[]>(rules.length ? rules : [emptyFilterRule()])

  function open() {
    setDraftRules(rules.length ? rules : [emptyFilterRule()])
    setIsOpen(true)
  }

  function close() {
    setDraftRules(rules.length ? rules : [emptyFilterRule()])
    setIsOpen(false)
  }

  function updateRule(ruleId: string, patch: Partial<FilterRule>) {
    setDraftRules(current => current.map(rule => rule.id === ruleId ? { ...rule, ...patch } : rule))
  }

  return (
    <div className="rw-filter-control">
      <button type="button" onClick={() => isOpen ? close() : open()}><FilterIcon /> Filter</button>
      {isOpen && (
        <div className="rw-filter-popover">
          <header><h3>Filter</h3><button type="button" aria-label="Close filter" onClick={close}><X size={16} /></button></header>
          <div className="rw-filter-rules">
            {draftRules.map((rule, index) => {
              const field = dataset.fields.find(item => item.id === rule.fieldId)
              const operators = filterOperatorsForField(field)
              return (
                <div className="rw-filter-rule" key={rule.id}>
                  <span>{index === 0 ? 'Where' : <select value={rule.join} onChange={event => updateRule(rule.id, { join: event.target.value as FilterJoin })}><option>AND</option><option>OR</option></select>}</span>
                  <FilterFieldPicker dataset={dataset} value={rule.fieldId} onChange={fieldId => updateRule(rule.id, { fieldId, operator: filterOperatorsForField(dataset.fields.find(item => item.id === fieldId))[0]?.value || 'contains', value: '' })} />
                  {rule.fieldId && <FilterOperatorPicker operators={operators} value={rule.operator} onChange={operator => updateRule(rule.id, { operator })} />}
                  {rule.fieldId && !operatorNeedsNoValue(rule.operator) && <input value={rule.value} onChange={event => updateRule(rule.id, { value: event.target.value })} placeholder="" />}
                  <button type="button" aria-label="Delete filter rule" onClick={() => setDraftRules(current => current.length === 1 ? [emptyFilterRule()] : current.filter(item => item.id !== rule.id))}><Trash2 size={15} /></button>
                </div>
              )
            })}
            <div className="rw-filter-actions">
              <button type="button" onClick={() => setDraftRules(current => [...current, emptyFilterRule('AND')])}><Plus size={15} /> Add rule</button>
              <button type="button" onClick={() => setDraftRules(current => [...current, emptyFilterRule('AND')])}><Plus size={15} /> Add nested rule</button>
            </div>
          </div>
          <footer><button type="button" onClick={close}>Cancel</button><button type="button" className="primary" onClick={() => {
            setRules(draftRules.filter(rule => rule.fieldId))
            setIsOpen(false)
          }}>Okay</button></footer>
        </div>
      )}
    </div>
  )
}

function FilterFieldPicker({ dataset, value, onChange }: { dataset: Dataset; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selectedField = dataset.fields.find(field => field.id === value)
  const systemFields = dataset.fields.filter(isSystemField).filter(field => field.label.toLowerCase().includes(query.toLowerCase()))
  const customFields = dataset.fields.filter(field => !isSystemField(field)).filter(field => field.label.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="rw-filter-picker">
      <button type="button" className={open ? 'active' : undefined} onClick={() => setOpen(!open)}>{selectedField?.label || 'Please select'} <ChevronDown size={15} /></button>
      {open && (
        <div className="rw-filter-dropdown">
          <label><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Quick filter" autoFocus /><Search size={15} /></label>
          <FieldPickerGroup title="Default" fields={systemFields} onPick={fieldId => {
            onChange(fieldId)
            setOpen(false)
          }} />
          <FieldPickerGroup title="Custom fields" fields={customFields} onPick={fieldId => {
            onChange(fieldId)
            setOpen(false)
          }} />
        </div>
      )}
    </div>
  )
}

function FieldPickerGroup({ title, fields, onPick }: { title: string; fields: DatasetField[]; onPick: (fieldId: string) => void }) {
  return <section><strong><ChevronDown size={13} /> {title}</strong>{fields.map(field => <button type="button" key={field.id} onClick={() => onPick(field.id)}>{iconForType(field.type)} {field.label}</button>)}</section>
}

function FilterOperatorPicker({ operators, value, onChange }: { operators: { value: FilterOperator; label: string }[]; value: FilterOperator; onChange: (value: FilterOperator) => void }) {
  const [open, setOpen] = useState(false)
  const selected = operators.find(operator => operator.value === value) || operators[0]
  return (
    <div className="rw-filter-picker operator">
      <button type="button" className={open ? 'active' : undefined} onClick={() => setOpen(!open)}>{selected?.label || 'Please select'} <ChevronDown size={15} /></button>
      {open && (
        <div className="rw-filter-dropdown operators">
          <label><input placeholder="Quick filter" readOnly /><Search size={15} /></label>
          {operators.map(operator => <button type="button" className={operator.value === value ? 'active' : undefined} key={operator.value} onClick={() => {
            onChange(operator.value)
            setOpen(false)
          }}>{operator.label}</button>)}
        </div>
      )}
    </div>
  )
}

function RecordsTable({
  dataset,
  datasets,
  records,
  rowHeight,
  onCreateField,
  onCreateRecord,
  onDeleteField,
  onReorderFields,
  onDeleteRecords,
  onUpdateRecordValue,
}: {
  dataset: Dataset
  datasets: Dataset[]
  records: DatasetRecord[]
  rowHeight: RowHeightOption
  onCreateField: () => void
  onCreateRecord: (name: string) => void
  onDeleteField: (fieldId: string) => void
  onReorderFields: (draggedFieldId: string, targetFieldId: string) => void
  onDeleteRecords: (recordIds: string[]) => void
  onUpdateRecordValue: (recordId: string, fieldId: string, value: string) => void
}) {
  const [draggedFieldId, setDraggedFieldId] = useState('')
  const [dropFieldId, setDropFieldId] = useState('')
  const [isAddingRecord, setIsAddingRecord] = useState(false)
  const [draftRecordName, setDraftRecordName] = useState('')
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const visibleRecordIdSet = new Set(records.map(record => record.id))
  const selectedVisibleRecordIds = selectedRecordIds.filter(recordId => visibleRecordIdSet.has(recordId))
  const allRecordsSelected = records.length > 0 && selectedVisibleRecordIds.length === records.length
  const rowHeightClass = `row-height-${slugify(rowHeight).replace(/_/g, '-')}`

  function startFieldDrag(event: DragEvent<HTMLTableCellElement>, fieldId: string) {
    setDraggedFieldId(fieldId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', fieldId)
  }

  function dropField(event: DragEvent<HTMLTableCellElement>, targetFieldId: string) {
    event.preventDefault()
    const sourceFieldId = event.dataTransfer.getData('text/plain') || draggedFieldId
    setDraggedFieldId('')
    setDropFieldId('')
    if (sourceFieldId && sourceFieldId !== targetFieldId) onReorderFields(sourceFieldId, targetFieldId)
  }

  function saveDraftRecord() {
    const name = draftRecordName.trim()
    if (!name) return
    onCreateRecord(name)
    setDraftRecordName('')
    setIsAddingRecord(false)
  }

  function toggleRecordSelection(recordId: string) {
    setSelectedRecordIds(current => current.includes(recordId) ? current.filter(idValue => idValue !== recordId) : [...current, recordId])
  }

  function toggleAllRecords() {
    setSelectedRecordIds(allRecordsSelected ? [] : records.map(record => record.id))
  }

  function confirmDeleteRecords(recordIds: string[]) {
    const targetIds = Array.from(new Set(recordIds)).filter(recordId => visibleRecordIdSet.has(recordId))
    if (!targetIds.length) return
    const count = targetIds.length
    const targetRecord = records.find(record => record.id === targetIds[0])
    const message = count === 1 && targetRecord
      ? `Delete record "${recordLabel(dataset, targetRecord)}"?`
      : `Delete ${count} selected records?`
    if (!window.confirm(message)) return
    onDeleteRecords(targetIds)
    setSelectedRecordIds(current => current.filter(recordId => !targetIds.includes(recordId)))
  }

  function columnWidth(field: DatasetField) {
    return columnWidths[field.id] || (field.id === 'name' ? 300 : 200)
  }

  function startColumnResize(event: MouseEvent<HTMLSpanElement>, field: DatasetField) {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = columnWidth(field)

    function handleMove(moveEvent: globalThis.MouseEvent) {
      const nextWidth = Math.max(90, startWidth + moveEvent.clientX - startX)
      setColumnWidths(current => ({ ...current, [field.id]: nextWidth }))
    }

    function handleUp() {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      document.body.classList.remove('rw-resizing-column')
    }

    document.body.classList.add('rw-resizing-column')
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <div className="rw-table-scroll">
      <table className={`records ${rowHeightClass}`}>
        <thead>
          <tr>
            <th className="record-select">
              <div className="record-select-controls">
                <input type="checkbox" aria-label="Select all records" checked={allRecordsSelected} onChange={toggleAllRecords} />
                <button
                  type="button"
                  className={`record-delete-action record-bulk-delete ${selectedVisibleRecordIds.length ? 'active' : ''}`}
                  aria-label="Delete selected records"
                  title="Delete selected records"
                  disabled={!selectedVisibleRecordIds.length}
                  onClick={() => confirmDeleteRecords(selectedVisibleRecordIds)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </th>
            {dataset.fields.map(field => {
              const isDragging = draggedFieldId === field.id
              const isDropTarget = dropFieldId === field.id && draggedFieldId !== field.id
              return (
                <th
                  key={field.id}
                  className={`${isDragging ? 'dragging' : ''}${isDropTarget ? ' drop-target' : ''}`}
                  style={{ width: columnWidth(field), minWidth: columnWidth(field) }}
                  draggable
                  title="Drag to reorder"
                  onDragStart={event => startFieldDrag(event, field.id)}
                  onDragEnter={() => setDropFieldId(field.id)}
                  onDragOver={event => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDragLeave={() => setDropFieldId(current => current === field.id ? '' : current)}
                  onDrop={event => dropField(event, field.id)}
                  onDragEnd={() => {
                    setDraggedFieldId('')
                    setDropFieldId('')
                  }}
                >
                  <span className="field-type-icon" aria-hidden="true">{iconForType(field.type)}</span>
                  <span>{field.label}</span>
                  <span className="record-column-resizer" role="separator" aria-label={`Resize ${field.label} column`} onMouseDown={event => startColumnResize(event, field)} />
                  <button
                    type="button"
                    draggable={false}
                    aria-label={`Field actions for ${field.label}`}
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => {
                      event.stopPropagation()
                      onDeleteField(field.id)
                    }}
                  >
                    <ChevronDown size={13} />
                  </button>
                </th>
              )
            })}
            <th className="record-add-field"><button type="button" aria-label="Add field" onClick={onCreateField}><Plus size={14} /></button></th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr key={record.id} className={selectedRecordIds.includes(record.id) ? 'record-selected' : undefined}>
              <td className="record-select">
                <div className="record-select-controls">
                  <input type="checkbox" aria-label="Select record" checked={selectedRecordIds.includes(record.id)} onChange={() => toggleRecordSelection(record.id)} />
                  <button
                    type="button"
                    className="record-delete-action record-row-delete"
                    aria-label={`Delete ${recordLabel(dataset, record)} record`}
                    title="Delete record"
                    onClick={() => confirmDeleteRecords([record.id])}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
              {dataset.fields.map(field => (
                <td key={field.id} style={{ width: columnWidth(field), minWidth: columnWidth(field) }}>
                  {isTimeField(field) ? (
                    <TimeCell
                      field={field}
                      record={record}
                      value={record.values[field.id] || ''}
                      onSave={value => onUpdateRecordValue(record.id, field.id, value)}
                    />
                  ) : isSingleSelectField(field) && field.options.length ? (
                    <SelectCell
                      field={field}
                      value={record.values[field.id] || ''}
                      onSave={value => onUpdateRecordValue(record.id, field.id, value)}
                    />
                  ) : recordCellValue(record, field, dataset, datasets)}
                </td>
              ))}
              <td />
            </tr>
          ))}
          <tr className={isAddingRecord ? 'record-add-row editing' : 'record-add-row'}>
            <td><button type="button" aria-label="Add row" onClick={() => setIsAddingRecord(true)}><Plus size={14} /></button></td>
            {dataset.fields.map((field, index) => (
              <td key={field.id} style={{ width: columnWidth(field), minWidth: columnWidth(field) }}>
                {isAddingRecord && index === 0 ? (
                  <label className="record-inline-input">
                    <span aria-hidden="true">{iconForType(field.type)}</span>
                    <input
                      value={draftRecordName}
                      onChange={event => setDraftRecordName(event.target.value)}
                      onBlur={saveDraftRecord}
                      onKeyDown={event => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                        if (event.key === 'Escape') {
                          setDraftRecordName('')
                          setIsAddingRecord(false)
                        }
                      }}
                      placeholder="Add new record ..."
                      autoFocus
                    />
                  </label>
                ) : null}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SelectCell({ field, value, onSave }: { field: DatasetField; value: string; onSave: (value: string) => void }) {
  const options = value && !field.options.includes(value) ? [value, ...field.options] : field.options

  return (
    <select className="record-option-cell" value={value} onChange={event => onSave(event.target.value)} aria-label={field.label}>
      <option value="">-</option>
      {options.map(option => <option value={option} key={option}>{option}</option>)}
    </select>
  )
}

function TimeCell({ field, record, value, onSave }: { field: DatasetField; record: DatasetRecord; value: string; onSave: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(value)

  function close() {
    setIsOpen(false)
    setDraftValue(value)
  }

  function save(nextValue = draftValue) {
    const normalized = normalizeTime(nextValue)
    onSave(normalized)
    setDraftValue(normalized)
    setIsOpen(false)
  }

  return (
    <div className="record-time-cell">
      <button type="button" className={isOpen ? 'active' : undefined} onClick={() => {
        setDraftValue(value)
        setIsOpen(true)
      }}>
        {value || ''}
      </button>
      {isOpen && (
        <div className="record-time-popover">
          <label className="record-time-field">
            <span>Time</span>
            <div>
              <Clock3 size={15} />
              <input
                type="time"
                value={draftValue}
                onChange={event => setDraftValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') save()
                  if (event.key === 'Escape') close()
                }}
                autoFocus
              />
            </div>
          </label>
          <div className="record-time-picker">
            <header>
              <strong>Select time</strong>
              <button type="button" aria-label="Close time picker" onClick={close}><X size={16} /></button>
            </header>
            <div>
              {timeChoices().map(choice => (
                <button
                  type="button"
                  className={draftValue === choice ? 'active' : undefined}
                  key={`${record.id}-${field.id}-${choice}`}
                  onClick={() => save(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          <footer>
            <button type="button" onClick={close}>Cancel</button>
            <button type="button" className="primary" onClick={() => save()}>Save</button>
          </footer>
        </div>
      )}
    </div>
  )
}

function DatasetForm({ form, setForm, onSubmit, onCancel, settings, accountName, folderOptions }: FormProps & { onCancel: () => void; settings: WorkspaceSettings; accountName: string; folderOptions: string[] }) {
  const owner = form.owner ?? settings.defaultOwner ?? accountName
  const [folderOpen, setFolderOpen] = useState(false)
  const options = Array.from(new Set(folderOptions)).sort((a, b) => a.localeCompare(b))
  const filteredOptions = options.filter(option => !form.folder || option.toLowerCase().includes(form.folder.toLowerCase()))

  return (
    <form onSubmit={onSubmit} className="rw-dataset-form">
      <input type="hidden" value={owner} name="owner" />
      <label className="rw-dataset-form-line">
        <span>Name *</span>
        <div className="rw-dataset-name-input">
          <input value={form.name || ''} onChange={event => setForm({ ...form, name: event.target.value, owner })} required placeholder="Name *" autoFocus />
          <Pencil size={16} />
        </div>
      </label>
      <label className="rw-dataset-form-line">
        <span>Dataset folder</span>
        <div className="rw-folder-combobox">
          <input
            value={form.folder || ''}
            onChange={event => {
              setForm({ ...form, folder: event.target.value, owner })
              setFolderOpen(true)
            }}
            onFocus={() => setFolderOpen(true)}
            onBlur={() => window.setTimeout(() => setFolderOpen(false), 120)}
            placeholder="Type or select client folder"
          />
          <button type="button" aria-label="Open folder list" onMouseDown={event => event.preventDefault()} onClick={() => setFolderOpen(!folderOpen)}><ChevronDown size={16} /></button>
          {folderOpen && options.length > 0 && (
            <div className="rw-folder-dropdown">
              {(filteredOptions.length ? filteredOptions : options).map(option => (
                <button
                  type="button"
                  key={option}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    setForm({ ...form, folder: option, owner })
                    setFolderOpen(false)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </label>
      <label className="rw-dataset-description">
        <Pencil size={14} />
        <input value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value, owner })} placeholder="Write a short description" />
      </label>
      <footer>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary">Save</button>
      </footer>
    </form>
  )
}

function TemplateChooser({ hasClientImportTemplate, onUseClientImportTemplate }: { hasClientImportTemplate: boolean; onUseClientImportTemplate: () => void }) {
  return (
    <section className="rw-template-chooser">
      <p className="rw-template-intro">Choose a ready dataset template to create or restore a table with the right fields.</p>
      <button type="button" className="rw-template-card" onClick={onUseClientImportTemplate}>
        <span className="rw-template-icon"><FileSpreadsheet size={20} /></span>
        <span>
          <strong>Client Import Template</strong>
          <small>Client type, logo/photo, contact details, account manager, revenue, payment terms, tags, and status.</small>
        </span>
        <em>{hasClientImportTemplate ? 'Restore template' : 'Use template'}</em>
      </button>
    </section>
  )
}

type FormProps = { form: Record<string, string>; setForm: (form: Record<string, string>) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }

function AddFieldsPicker({
  activeTab,
  setActiveTab,
  dataset,
  datasets,
  folderOptions,
  accountName,
  onStartField,
  onCopyField,
  onUpdateDataset,
  onApplyClientTemplate,
  onToggleView,
  onSetDefaultView,
  onDeleteView,
  onExport,
  onImport,
}: {
  activeTab: 'new' | 'existing'
  setActiveTab: (tab: 'new' | 'existing') => void
  dataset: Dataset
  datasets: Dataset[]
  folderOptions: string[]
  accountName: string
  onStartField: (type: FieldType) => void
  onCopyField: (field: DatasetField) => void
  onUpdateDataset: (dataset: Dataset) => void
  onApplyClientTemplate: (dataset: Dataset) => void
  onToggleView: (datasetId: string, viewId: string) => void
  onSetDefaultView: (datasetId: string, viewId: string) => void
  onDeleteView: (datasetId: string, viewId: string) => void
  onExport: (dataset: Dataset, fieldIds: string[]) => void
  onImport: (dataset: Dataset, payload: string) => boolean
}) {
  const [mode, setMode] = useState<'manage' | 'add'>('manage')
  const [settingsTab, setSettingsTab] = useState<'info' | 'access' | 'fields' | 'views' | 'export' | 'import'>('fields')
  const [draft, setDraft] = useState(() => dataset)
  const [viewDraft, setViewDraft] = useState('')
  const [exportFieldIds, setExportFieldIds] = useState(() => dataset.fields.filter(field => !isSystemField(field)).map(field => field.id))
  const [importPayload, setImportPayload] = useState('')
  const [templateUndoDataset, setTemplateUndoDataset] = useState<Dataset | null>(null)
  const reusableFields = datasets
    .flatMap(item => item.fields.map(field => ({ dataset: item, field })))
    .filter(item => item.dataset.id !== dataset.id || !dataset.fields.some(field => field.id === item.field.id))

  function saveDraft() {
    onUpdateDataset({ ...draft, updatedAt: now() })
  }

  function applyClientTemplate() {
    const nextDataset = applyClientImportTemplateFields(dataset, accountName)
    setTemplateUndoDataset(dataset)
    setDraft(nextDataset)
    setSettingsTab('fields')
    onApplyClientTemplate(nextDataset)
  }

  function undoClientTemplate() {
    if (!templateUndoDataset) return
    const restoredDataset = { ...templateUndoDataset, updatedAt: now() }
    setDraft(restoredDataset)
    setTemplateUndoDataset(null)
    setSettingsTab('fields')
    onUpdateDataset(restoredDataset)
  }

  function handleFile(file?: File) {
    if (!file) return
    const workbookFile = /\.(xlsx|xlsm|xls)$/i.test(file.name)
    if (workbookFile) {
      setImportPayload('Excel workbook parsing is disabled for security. Export the sheet as CSV, TSV, JSON, or HTML table and import that file instead.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImportPayload(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.readAsText(file)
  }

  const customFields = dataset.fields.filter(field => !isSystemField(field))
  const activeOwners = draft.owners?.length ? draft.owners : [draft.owner || accountName]
  const activeFollowers = draft.followers?.length ? draft.followers : [accountName]

  if (mode === 'manage') {
    return (
      <div className="rw-manage-fields-dialog">
        <aside>
          <h3>General setting</h3>
          <button type="button" className={settingsTab === 'info' ? 'active' : undefined} onClick={() => setSettingsTab('info')}><Database size={15} /> Dataset information</button>
          <button type="button" className={settingsTab === 'access' ? 'active' : undefined} onClick={() => setSettingsTab('access')}><ShieldCheck size={15} /> Access & visibilities</button>
          <button type="button" className={settingsTab === 'fields' ? 'active' : undefined} onClick={() => setSettingsTab('fields')}><CheckSquare size={15} /> Manage fields</button>
          <button type="button" className={settingsTab === 'views' ? 'active' : undefined} onClick={() => setSettingsTab('views')}><Table2 size={15} /> Manage views</button>
          <h3>Templates</h3>
          <button type="button" className="template-action" onClick={applyClientTemplate}><FileSpreadsheet size={15} /> Use Client Import Template</button>
          {templateUndoDataset && <button type="button" className="undo-template-action" onClick={undoClientTemplate}><Undo2 size={15} /> Undo template</button>}
          <h3>Quick actions</h3>
          <button type="button" className={settingsTab === 'export' ? 'active' : undefined} onClick={() => setSettingsTab('export')}><FileSpreadsheet size={15} /> Export records to Excel</button>
          <button type="button" className={settingsTab === 'import' ? 'active' : undefined} onClick={() => setSettingsTab('import')}><UploadCloud size={15} /> Import records from Excel</button>
        </aside>
        <main>
          {settingsTab === 'info' && <DatasetInfoSettings draft={draft} setDraft={setDraft} folderOptions={folderOptions} onSave={saveDraft} />}
          {settingsTab === 'access' && <DatasetAccessSettings draft={draft} setDraft={setDraft} activeOwners={activeOwners} activeFollowers={activeFollowers} onSave={saveDraft} />}
          {settingsTab === 'fields' && <DatasetFieldsSettings dataset={dataset} onAddField={() => setMode('add')} onApplyTemplate={applyClientTemplate} onUndoTemplate={undoClientTemplate} canUndoTemplate={Boolean(templateUndoDataset)} onDeleteField={fieldId => {
            const nextRecords = dataset.records.map(record => {
              const values = { ...record.values }
              delete values[fieldId]
              return { ...record, values, updatedAt: now() }
            })
            onUpdateDataset({
              ...dataset,
              fields: dataset.fields.filter(field => field.id !== fieldId),
              records: nextRecords,
              views: dataset.views.map(view => view.filterFieldId === fieldId ? { ...view, filterFieldId: undefined, filterValue: undefined } : view),
              updatedAt: now(),
            })
          }} />}
          {settingsTab === 'views' && (
            <DatasetViewsSettings
              dataset={dataset}
              viewDraft={viewDraft}
              setViewDraft={setViewDraft}
              onToggleView={onToggleView}
              onSetDefaultView={onSetDefaultView}
              onDeleteView={onDeleteView}
              onUpdateDataset={onUpdateDataset}
            />
          )}
          {settingsTab === 'export' && <DatasetExportSettings dataset={dataset} fields={customFields} exportFieldIds={exportFieldIds} setExportFieldIds={setExportFieldIds} onExport={onExport} />}
          {settingsTab === 'import' && <DatasetImportSettings dataset={dataset} importPayload={importPayload} setImportPayload={setImportPayload} onFile={handleFile} onExport={onExport} onImport={onImport} />}
        </main>
      </div>
    )
  }

  return (
    <div className="rw-add-fields">
      <div className="rw-add-fields-head">
        <button type="button" onClick={() => setMode('manage')}><ArrowLeft size={14} /> Back to fields</button>
        <strong>Add field</strong>
      </div>
      <div className="add-tabs">
        <button type="button" className={activeTab === 'new' ? 'active' : ''} onClick={() => setActiveTab('new')}>Create a new standard field</button>
        <button type="button" className={activeTab === 'existing' ? 'active' : ''} onClick={() => setActiveTab('existing')}>Pick existing data fields</button>
      </div>
      {activeTab === 'new' ? (
        <div className="field-card-grid">
          {fieldCards.map(card => (
            <button type="button" className={`field-type ${card.tone}`} key={card.type} onClick={() => onStartField(card.type)}>
              <span>{card.icon}</span>
              <strong>{card.type}</strong>
              <small>{card.description}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="existing-fields">
          <section>
            <h3>Existing fields <span>{reusableFields.length}</span></h3>
            {reusableFields.map(({ dataset: sourceDataset, field }) => (
              <button type="button" key={`${sourceDataset.id}-${field.id}`} onClick={() => onCopyField(field)}>
                <span>{iconForType(field.type)}</span>
                <strong>{field.label}</strong>
                <small>{sourceDataset.name}</small>
                <em>{field.type}</em>
              </button>
            ))}
            {!reusableFields.length && <p>No reusable fields are available yet.</p>}
          </section>
        </div>
      )}
    </div>
  )
}

function DatasetInfoSettings({ draft, setDraft, folderOptions, onSave }: { draft: Dataset; setDraft: (dataset: Dataset) => void; folderOptions: string[]; onSave: () => void }) {
  return (
    <>
      <h2>Dataset information</h2>
      <section className="rw-settings-panel">
        <h3>General information</h3>
        <p>Configure basic dataset details and permissions</p>
        <label>Dataset name<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Description<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Description" /></label>
        <label>Dataset folder<input list="manage-dataset-folders" value={draft.folder} onChange={event => setDraft({ ...draft, folder: event.target.value || 'Uncategorized' })} /><datalist id="manage-dataset-folders">{folderOptions.map(folder => <option value={folder} key={folder} />)}</datalist></label>
        <Toggle label="Custom naming for your records" detail="Use a custom display name for new records in this dataset." checked={Boolean(draft.customNaming)} onChange={value => setDraft({ ...draft, customNaming: value })} />
        <label>Custom leading field name<input value={draft.leadingFieldName || ''} onChange={event => setDraft({ ...draft, leadingFieldName: event.target.value })} placeholder="Name" /></label>
        <label className="rw-check-row"><input type="checkbox" checked={Boolean(draft.allowPublicSelect)} onChange={event => setDraft({ ...draft, allowPublicSelect: event.target.checked })} /> Allow for select in public (Show name only)</label>
        <label className="rw-check-row"><input type="checkbox" checked={Boolean(draft.allowAdvancedTable)} onChange={event => setDraft({ ...draft, allowAdvancedTable: event.target.checked })} /> Allow for using in Advance table field in other apps</label>
        <footer><small>Click on <b>Save</b> button to save your changes.</small><button type="button" className="primary" onClick={onSave}>Save</button></footer>
      </section>
      <section className="rw-settings-panel compact"><h3>Enable dataset performance boosting <em>BETA</em></h3><Toggle label="Enable pagination for large datasets to improve performance" detail="" checked={Boolean(draft.performanceBoosting)} onChange={value => setDraft({ ...draft, performanceBoosting: value })} /></section>
    </>
  )
}

function DatasetAccessSettings({ draft, setDraft, activeOwners, activeFollowers, onSave }: { draft: Dataset; setDraft: (dataset: Dataset) => void; activeOwners: string[]; activeFollowers: string[]; onSave: () => void }) {
  return (
    <>
      <h2>Accesses & visibilities</h2>
      <section className="rw-settings-panel">
        <h3>Dataset roles</h3>
        <p>Assign and manage users who can oversee and edit your dataset</p>
        <PeopleEditor label="Dataset owners" people={activeOwners} onChange={people => setDraft({ ...draft, owners: people, owner: people[0] || draft.owner })} />
        <PeopleEditor label="Dataset followers" people={activeFollowers} onChange={people => setDraft({ ...draft, followers: people })} />
        <label>Record visibility<select value={draft.recordVisibility || 'details'} onChange={event => setDraft({ ...draft, recordVisibility: event.target.value })}><option value="details">Anyone who can access the dataset can view all record details</option><option value="name">Only show record names by default</option></select></label>
        <footer><small>Click on <b>Save</b> button to save your changes.</small><button type="button" className="primary" onClick={onSave}>Save</button></footer>
      </section>
      <section className="rw-settings-panel">
        <h3>Dataset access and visibility</h3>
        <p>Dataset owners have full permissions by default.</p>
        <fieldset><legend>Who can access the dataset?</legend><label><input type="radio" checked={(draft.accessMode || 'everyone') === 'everyone'} onChange={() => setDraft({ ...draft, accessMode: 'everyone' })} /> Everyone can access it</label><label><input type="radio" checked={draft.accessMode === 'limited'} onChange={() => setDraft({ ...draft, accessMode: 'limited' })} /> Limit who can access it</label></fieldset>
        <fieldset><legend>Who can create new records in the dataset?</legend><label><input type="radio" checked={(draft.createMode || 'everyone') === 'everyone'} onChange={() => setDraft({ ...draft, createMode: 'everyone' })} /> Everyone who can access it can create new records</label><label><input type="radio" checked={draft.createMode === 'limited'} onChange={() => setDraft({ ...draft, createMode: 'limited' })} /> Limit who can create new records</label></fieldset>
        <footer><small>Click on <b>Save</b> button to save your changes.</small><button type="button" className="primary" onClick={onSave}>Save</button></footer>
      </section>
    </>
  )
}

function PeopleEditor({ label, people, onChange }: { label: string; people: string[]; onChange: (people: string[]) => void }) {
  const [entry, setEntry] = useState('')
  return (
    <div className="rw-people-editor">
      <span>{label}</span>
      <div>{people.map(person => <button type="button" key={person} title={person} onClick={() => onChange(people.filter(item => item !== person))}><b>{initials(person).slice(0, 1)}</b>{person}<X size={13} /></button>)}</div>
      <input value={entry} onChange={event => setEntry(event.target.value)} onKeyDown={event => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        const value = entry.trim()
        if (!value) return
        onChange(Array.from(new Set([...people, value])))
        setEntry('')
      }} placeholder="Type a user name, then press Enter" />
    </div>
  )
}

function DatasetFieldsSettings({
  dataset,
  onAddField,
  onApplyTemplate,
  onUndoTemplate,
  canUndoTemplate,
  onDeleteField,
}: {
  dataset: Dataset
  onAddField: () => void
  onApplyTemplate: () => void
  onUndoTemplate: () => void
  canUndoTemplate: boolean
  onDeleteField: (fieldId: string) => void
}) {
  const [openFieldId, setOpenFieldId] = useState('')
  const [pendingDeleteField, setPendingDeleteField] = useState<DatasetField | null>(null)

  function deleteField(field: DatasetField) {
    if (isSystemField(field)) return
    setPendingDeleteField(field)
    setOpenFieldId('')
  }

  function confirmDeleteField() {
    if (!pendingDeleteField) return
    onDeleteField(pendingDeleteField.id)
    setPendingDeleteField(null)
  }

  function closeDeleteDialog() {
    setPendingDeleteField(null)
  }

  return (
    <>
      <h2>Dataset fields</h2>
      <section>
        <header>
          <h3>Fields</h3>
          <div>
            <button type="button" aria-label="More field actions"><MoreHorizontal size={18} /></button>
            {canUndoTemplate && <button type="button" className="undo-template" onClick={onUndoTemplate}><Undo2 size={15} /> Undo</button>}
            <button type="button" className="template" onClick={onApplyTemplate}><FileSpreadsheet size={15} /> Use template</button>
            <button type="button" onClick={onAddField}>Add field</button>
          </div>
        </header>
        <div className="rw-active-field-list">
          {dataset.fields.map(field => (
            <article key={field.id}>
              <span className="drag">::</span>
              <span className="icon">{iconForType(field.type)}</span>
              <div><strong>{field.label}</strong><small>{field.type} - {field.key}</small>{field.description && <p>{field.description}</p>}</div>
              <em>{isSystemField(field) ? 'INTERNAL' : 'GENERAL'}</em>
              <em>DATASETS.DATASET</em>
              <div className="rw-field-row-actions">
                <button type="button" aria-label={`Actions for ${field.label}`} onClick={() => setOpenFieldId(openFieldId === field.id ? '' : field.id)}><MoreHorizontal size={16} /></button>
                {openFieldId === field.id && (
                  <div>
                    <button type="button" disabled={isSystemField(field)} onClick={() => deleteField(field)}><Trash2 size={14} /> Delete field</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      {pendingDeleteField && (
        <div className="rw-confirm-backdrop" role="presentation" onMouseDown={closeDeleteDialog}>
          <section className="rw-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-field-title" onMouseDown={event => event.stopPropagation()}>
            <button type="button" aria-label="Close delete confirmation" onClick={closeDeleteDialog}><X size={18} /></button>
            <div className="rw-confirm-icon"><Trash2 size={22} /></div>
            <h3 id="delete-field-title">Delete field?</h3>
            <p>
              <strong>{pendingDeleteField.label}</strong> will be removed from this dataset, including its values in every record.
            </p>
            <footer>
              <button type="button" onClick={closeDeleteDialog}>Cancel</button>
              <button type="button" className="danger" onClick={confirmDeleteField}>Delete field</button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}

function DatasetViewsSettings({ dataset, viewDraft, setViewDraft, onToggleView, onSetDefaultView, onDeleteView, onUpdateDataset }: { dataset: Dataset; viewDraft: string; setViewDraft: (value: string) => void; onToggleView: (datasetId: string, viewId: string) => void; onSetDefaultView: (datasetId: string, viewId: string) => void; onDeleteView: (datasetId: string, viewId: string) => void; onUpdateDataset: (dataset: Dataset) => void }) {
  return (
    <>
      <h2>View settings</h2>
      <section className="rw-settings-panel">
        <h3>Dataset views</h3>
        <p>Set up default view and display options.</p>
        <div className="rw-view-settings-list">{dataset.views.map(view => <article key={view.id}><label className="switch"><input type="checkbox" checked={view.enabled} onChange={() => onToggleView(dataset.id, view.id)} /><span /></label><Table2 size={14} /><strong>{view.name}</strong>{view.default && <em>DEFAULT VIEW</em>}{!view.default && <button type="button" onClick={() => onSetDefaultView(dataset.id, view.id)}>Make default</button>}{!view.default && dataset.views.length > 1 && <button type="button" className="danger" onClick={() => onDeleteView(dataset.id, view.id)}><Trash2 size={14} /></button>}</article>)}</div>
        <div className="rw-inline-view-form"><button type="button" onClick={() => {
          const view: DatasetView = { id: id('view'), name: viewDraft.trim() || `View ${dataset.views.length + 1}`, enabled: true, records: [] }
          onUpdateDataset({ ...dataset, views: [...dataset.views, view], updatedAt: now() })
          setViewDraft('')
        }}><Plus size={14} /> Create</button><input value={viewDraft} onChange={event => setViewDraft(event.target.value)} placeholder="View name" /></div>
      </section>
    </>
  )
}

function DatasetExportSettings({ dataset, fields, exportFieldIds, setExportFieldIds, onExport }: { dataset: Dataset; fields: DatasetField[]; exportFieldIds: string[]; setExportFieldIds: (ids: string[]) => void; onExport: (dataset: Dataset, fieldIds: string[]) => void }) {
  return (
    <>
      <h2>Export records in dataset</h2>
      <section className="rw-settings-panel export">
        <p className="notice">Notice: Export records from this dataset with all conditions of the filters. Support exporting up to 1000 latest update records.</p>
        <header><h3>Custom fields</h3><button type="button" onClick={() => setExportFieldIds(exportFieldIds.length ? [] : fields.map(field => field.id))}>{exportFieldIds.length ? 'Uncheck all' : 'Check all'}</button></header>
        <div className="rw-export-fields">{fields.map(field => <label key={field.id}><input type="checkbox" checked={exportFieldIds.includes(field.id)} onChange={event => setExportFieldIds(event.target.checked ? [...exportFieldIds, field.id] : exportFieldIds.filter(idValue => idValue !== field.id))} /> {field.label}</label>)}</div>
        <footer><button type="button">Cancel</button><button type="button" className="primary" onClick={() => onExport(dataset, exportFieldIds)}>Export</button></footer>
      </section>
    </>
  )
}

function DatasetImportSettings({ dataset, importPayload, setImportPayload, onFile, onExport, onImport }: { dataset: Dataset; importPayload: string; setImportPayload: (value: string) => void; onFile: (file?: File) => void; onExport: (dataset: Dataset, fieldIds: string[]) => void; onImport: (dataset: Dataset, payload: string) => boolean }) {
  return (
    <>
      <h2>Import records</h2>
      <form className="rw-settings-panel import" onSubmit={event => {
        event.preventDefault()
        if (onImport(dataset, importPayload)) setImportPayload('')
      }}>
        <label>Choose import file<input type="file" accept=".csv,.tsv,.txt,.json,.html,.htm" onChange={event => onFile(event.target.files?.[0])} /></label>
        <p className="notice">Please choose a CSV, TSV, JSON, or HTML table export with column orders as below. <button type="button" onClick={() => onExport(dataset, dataset.fields.map(field => field.id))}>Download?</button></p>
        <div className="rw-import-columns">{dataset.fields.map((field, index) => <article key={field.id}><span>{String(index + 1).padStart(2, '0')}.</span><strong>{field.label}</strong><code>{field.key}</code></article>)}</div>
        <label>Paste rows<textarea value={importPayload} onChange={event => setImportPayload(event.target.value)} placeholder="Name,Description&#10;Example,Imported row" /></label>
        <footer><button type="button" onClick={() => setImportPayload('')}>Cancel</button><button type="submit" className="primary">Continue</button></footer>
      </form>
    </>
  )
}

function FieldForm({ form, setForm, onSubmit, dataset, datasets }: FormProps & { dataset: Dataset; datasets: Dataset[] }) {
  const type = (form.type || 'Simple text') as FieldType
  const isRollup = type === 'Rollup (beta)'
  const needsOptions = type.includes('Dropdown') || type === 'Select'
  const needsFormula = type === 'Custom formula'
  const needsLinkedDataset = type.includes('Link') || type.includes('Lookup') || isRollup
  const [typeOpen, setTypeOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [datasetOpen, setDatasetOpen] = useState(false)
  const [datasetFilter, setDatasetFilter] = useState('')
  const [rollupFieldOpen, setRollupFieldOpen] = useState(false)
  const [rollupFieldFilter, setRollupFieldFilter] = useState('')
  const [aggregateOpen, setAggregateOpen] = useState(false)
  const [aggregateFilter, setAggregateFilter] = useState('')
  const selectedDataset = datasets.find(dataset => dataset.id === form.linkedDatasetId)
  const rollupSourceFields = dataset.fields.filter(field => isLinkedRecordField(field))
  const selectedRollupSourceField = rollupSourceFields.find(field => field.id === form.rollupSourceFieldId)
  const rollupLinkedDataset = datasets.find(item => item.id === selectedRollupSourceField?.linkedDatasetId)
  const filteredTypes = fieldCards.filter(card => [card.type, card.description].join(' ').toLowerCase().includes(typeFilter.toLowerCase()))
  const filteredDatasets = datasets.filter(dataset => [dataset.name, dataset.description].join(' ').toLowerCase().includes(datasetFilter.toLowerCase()))
  const filteredRollupFields = (rollupLinkedDataset?.fields || []).filter(field => [field.label, field.type].join(' ').toLowerCase().includes(rollupFieldFilter.toLowerCase()))
  const selectedRollupField = rollupLinkedDataset?.fields.find(field => field.id === form.rollupFieldId)
  const aggregateOptions = ['Count', 'Min', 'Max', 'Sum', 'Average']
  const filteredAggregateOptions = aggregateOptions.filter(option => option.toLowerCase().includes(aggregateFilter.toLowerCase()))

  function updateType(nextType: FieldType) {
    setForm({ ...form, type: nextType, label: form.label || (nextType === 'Link to another record (beta)' ? 'Link to another record' : nextType) })
    setTypeOpen(false)
    setTypeFilter('')
  }

  return (
    <form onSubmit={onSubmit} className="rw-standard-field-form">
      <section className="rw-standard-field-main">
        <label className="rw-standard-line">
          <span>Field name *</span>
          <input value={form.label || ''} onChange={event => setForm({ ...form, label: event.target.value })} required autoFocus />
        </label>
        <label className="rw-standard-description">
          <Pencil size={14} />
          <input value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Field description" />
        </label>
        <div className="rw-field-scope">
          <span>Field scope * <small>i</small></span>
          <label><input type="radio" name="field-scope" /> Common field</label>
          <label><input type="radio" name="field-scope" defaultChecked /> General field</label>
          <label><input type="radio" name="field-scope" /> Internal service field</label>
        </div>
        <div className="rw-picker-field">
          <span>Field type *</span>
          <button type="button" className={typeOpen ? 'active' : undefined} onClick={() => setTypeOpen(!typeOpen)}>
            {iconForType(type)} {type} <ChevronDown size={15} />
          </button>
          {typeOpen && (
            <div className="rw-dropdown-panel">
              <label>
                <input value={typeFilter} onChange={event => setTypeFilter(event.target.value)} placeholder="Quick filter" autoFocus />
                <Search size={15} />
              </label>
              <div>
                {filteredTypes.map(card => (
                  <button type="button" className={card.type === type ? 'active' : undefined} key={card.type} onClick={() => updateType(card.type)}>
                    <span>{card.icon}</span>
                    <strong>{card.type}</strong>
                    <small>{card.description}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {needsLinkedDataset && !isRollup && (
          <div className="rw-picker-field">
            <span>Dataset to associate with *</span>
            <button type="button" className={datasetOpen ? 'active' : undefined} onClick={() => setDatasetOpen(!datasetOpen)}>
              {selectedDataset ? selectedDataset.name : 'Please select'} <ChevronDown size={15} />
            </button>
            {datasetOpen && (
              <div className="rw-dropdown-panel dataset">
                <label>
                  <input value={datasetFilter} onChange={event => setDatasetFilter(event.target.value)} placeholder="Quick filter" autoFocus />
                  <Search size={15} />
                </label>
                <div>
                  {filteredDatasets.map(dataset => (
                    <button type="button" className={form.linkedDatasetId === dataset.id ? 'active' : undefined} key={dataset.id} onClick={() => {
                      setForm({ ...form, linkedDatasetId: dataset.id })
                      setDatasetOpen(false)
                      setDatasetFilter('')
                    }}>
                      <span><Grid2X2 size={16} /></span>
                      <strong>{dataset.name}</strong>
                      <small>{dataset.description || 'No description'}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <small>Select the dataset you want to associate with</small>
          </div>
        )}
        {isRollup && (
          <>
            <div className="rw-picker-field">
              <span>Select rollup source *</span>
              <button type="button" className={datasetOpen ? 'active' : undefined} onClick={() => setDatasetOpen(!datasetOpen)}>
                {selectedRollupSourceField ? selectedRollupSourceField.label : 'Please select'} <ChevronDown size={15} />
              </button>
              {datasetOpen && (
                <div className="rw-dropdown-panel dataset">
                  <label>
                    <input value={datasetFilter} onChange={event => setDatasetFilter(event.target.value)} placeholder="Quick filter" autoFocus />
                    <Search size={15} />
                  </label>
                  <div>
                    {rollupSourceFields.filter(field => [field.label, field.type].join(' ').toLowerCase().includes(datasetFilter.toLowerCase())).map(field => {
                      const sourceDataset = datasets.find(item => item.id === field.linkedDatasetId)
                      return (
                      <button type="button" className={form.rollupSourceFieldId === field.id ? 'active' : undefined} key={field.id} onClick={() => {
                        setForm({ ...form, rollupSourceFieldId: field.id, linkedDatasetId: field.linkedDatasetId || '', rollupFieldId: '' })
                        setDatasetOpen(false)
                        setDatasetFilter('')
                      }}>
                        <span>{iconForType(field.type)}</span>
                        <strong>{field.label}</strong>
                        <small>{sourceDataset?.name || 'Linked dataset'}</small>
                      </button>
                      )
                    })}
                    {!rollupSourceFields.length && <p className="rw-dropdown-empty">Create a linked-record field first.</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="rw-picker-field">
              <span>Select field you want to rollup *</span>
              <button type="button" className={rollupFieldOpen ? 'active' : undefined} onClick={() => setRollupFieldOpen(!rollupFieldOpen)}>
                {selectedRollupField ? selectedRollupField.label : 'Please select'} <ChevronDown size={15} />
              </button>
              {rollupFieldOpen && (
                <div className="rw-dropdown-panel">
                  <label>
                    <input value={rollupFieldFilter} onChange={event => setRollupFieldFilter(event.target.value)} placeholder="Quick filter" autoFocus />
                    <Search size={15} />
                  </label>
                  <div>
                    {filteredRollupFields.map(field => (
                      <button type="button" className={form.rollupFieldId === field.id ? 'active' : undefined} key={field.id} onClick={() => {
                        setForm({ ...form, rollupFieldId: field.id })
                        setRollupFieldOpen(false)
                        setRollupFieldFilter('')
                      }}>
                        <span>{iconForType(field.type)}</span>
                        <strong>{field.label}</strong>
                        <small>{field.typeName || field.type.toLowerCase()}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rw-picker-field">
              <span>Aggregate function</span>
              <button type="button" className={aggregateOpen ? 'active' : undefined} onClick={() => setAggregateOpen(!aggregateOpen)}>
                {form.aggregateFunction || 'Count'} <ChevronDown size={15} />
              </button>
              {aggregateOpen && (
                <div className="rw-dropdown-panel aggregate">
                  <label>
                    <input value={aggregateFilter} onChange={event => setAggregateFilter(event.target.value)} placeholder="Quick filter" autoFocus />
                    <Search size={15} />
                  </label>
                  <div>
                    {filteredAggregateOptions.map(option => (
                      <button type="button" className={(form.aggregateFunction || 'Count') === option ? 'active' : undefined} key={option} onClick={() => {
                        setForm({ ...form, aggregateFunction: option })
                        setAggregateOpen(false)
                        setAggregateFilter('')
                      }}>
                        <strong>{option}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <label className="rw-rollup-condition">
              <span>Only include linked records that meet specific conditions</span>
              <input type="checkbox" checked={form.rollupConditions === 'true'} onChange={event => setForm({ ...form, rollupConditions: String(event.target.checked) })} />
            </label>
          </>
        )}
        {needsOptions && <Field label="Options" value={form.options} onChange={value => setForm({ ...form, options: value })} placeholder="Active, Pending, Closed" />}
        {needsFormula && <Field label="Formula" value={form.formula} onChange={value => setForm({ ...form, formula: value })} placeholder="{field_one} + {field_two}" />}
        {needsLinkedDataset && !isRollup && <label className="rw-link-multiple"><input type="checkbox" checked={form.allowMultiple === 'true'} onChange={event => setForm({ ...form, allowMultiple: String(event.target.checked) })} /> Allow link multiple items</label>}
      </section>

      <aside className="rw-standard-settings">
        <h3>Service field settings</h3>
        <div className="rw-settings-box">
          <label><input type="checkbox" defaultChecked /> Show on forms</label>
          <label><input type="checkbox" defaultChecked /> Show on custom views</label>
          <label><input type="checkbox" checked={form.required === 'true'} onChange={event => setForm({ ...form, required: String(event.target.checked) })} /> This is a required field <b>*</b></label>
          <label><input type="checkbox" /> This is an important field <b>*</b></label>
        </div>
        <h3>Service-based rules</h3>
        {['This is a stage-based output field', 'Service-based field level security', 'Conditionally enabled on another field value'].map(rule => (
          <button type="button" className="rw-rule-row" key={rule}><span />{rule}<X size={14} /></button>
        ))}
        <h3>General rules and display options</h3>
        <button type="button" className="rw-display-row">Display options<X size={14} /></button>
      </aside>

      <footer>
        <button type="button">Cancel</button>
        <button type="submit" className="primary">Save</button>
      </footer>
    </form>
  )
}

function RecordForm({ dataset, datasets, form, setForm, onSubmit, onCancel, accountName, clientChoices }: FormProps & { dataset: Dataset; datasets: Dataset[]; onCancel: () => void; accountName: string; clientChoices: ClientChoice[] }) {
  const editableFields = dataset.fields.filter(field => !isSystemField(field) && !isComputedField(field))
  const primaryField = editableFields.find(field => field.id === 'name') || editableFields[0]
  const customFields = editableFields.filter(field => field.id !== primaryField?.id)
  const requiredCount = editableFields.filter(field => field.required).length

  return (
    <form onSubmit={onSubmit} className="rw-record-form">
      <section className="rw-record-main">
        <div className="rw-record-heading">
          <span><FileSpreadsheet size={18} /></span>
          <div>
            <strong>Record details</strong>
            <small>{dataset.name}</small>
          </div>
          <em>{requiredCount} required</em>
        </div>
        {primaryField && (
          <div className="rw-record-primary-card">
            <RecordFieldControl field={primaryField} datasets={datasets} form={form} setForm={setForm} clientChoices={clientChoices} primary />
          </div>
        )}
        {customFields.length > 0 && (
          <div className="rw-custom-field-divider">
            <span>Fields</span>
            <small>{customFields.length}</small>
          </div>
        )}
        <div className="rw-record-fields-grid">
          {customFields.map(field => <RecordFieldControl key={field.id} field={field} datasets={datasets} form={form} setForm={setForm} clientChoices={clientChoices} />)}
        </div>
      </section>
      <aside className="rw-record-settings">
        <div className="rw-record-dataset-card">
          <span><Database size={17} /></span>
          <strong>{dataset.name}</strong>
          <small>{editableFields.length} fields</small>
        </div>
        <div className="rw-record-settings-card">
          <h3>Access</h3>
          <RecordPeopleBox label="Owners" name={accountName} />
          <RecordPeopleBox label="Followers" name={accountName} />
        </div>
      </aside>
      <footer>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary">Save Record</button>
      </footer>
    </form>
  )
}

function RecordFieldControl({ field, datasets, form, setForm, clientChoices, primary = false }: {
  field: DatasetField
  datasets: Dataset[]
  form: Record<string, string>
  setForm: (form: Record<string, string>) => void
  clientChoices: ClientChoice[]
  primary?: boolean
}) {
        const label = `${field.label}${field.required ? ' *' : ''}`
        if (field.type === 'Client dropdown') {
          return (
            <label className="rw-form-line" key={field.id}>
              {label}
              <select value={form[field.id] || ''} onChange={event => setForm({ ...form, [field.id]: event.target.value })} required={field.required}>
                <option value="">{clientChoices.length ? 'Choose client' : 'No clients found'}</option>
                {clientChoices.map(client => <option value={client.value} key={client.value}>{client.label}{client.detail ? ` - ${client.detail}` : ''}</option>)}
              </select>
            </label>
          )
        }
        if (isLinkedRecordField(field)) {
          const linkedDataset = datasets.find(item => item.id === field.linkedDatasetId)
          const selectedValues = parseLinkedIds(form[field.id])
          return (
            <label className="rw-form-line" key={field.id}>
              {label}
              <select
                value={field.allowMultiple ? '' : form[field.id] || ''}
                onChange={event => {
                  if (!field.allowMultiple) {
                    setForm({ ...form, [field.id]: event.target.value })
                    return
                  }
                  const nextValues = Array.from(new Set([...selectedValues, event.target.value].filter(Boolean)))
                  setForm({ ...form, [field.id]: nextValues.join(',') })
                }}
                required={field.required}
              >
                <option value="">{linkedDataset ? 'Choose record' : 'No linked dataset selected'}</option>
                {linkedDataset?.records.map(record => <option value={record.id} key={record.id}>{recordLabel(linkedDataset, record)}</option>)}
              </select>
              {field.allowMultiple && selectedValues.length > 0 && <small>{selectedValues.map(idValue => linkedDataset?.records.find(record => record.id === idValue)).filter(Boolean).map(record => linkedDataset ? recordLabel(linkedDataset, record as DatasetRecord) : '').join(', ')}</small>}
            </label>
          )
        }
        if (field.type === 'Dropdown, multiple') {
          return <MultiOptionField key={field.id} field={field} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} />
        }
        if (field.type === 'Select' || field.type === 'Dropdown, single') {
          return (
            <label className="rw-form-line" key={field.id}>
              {label}
              <select value={form[field.id] || ''} onChange={event => setForm({ ...form, [field.id]: event.target.value })} required={field.required}>
                <option value="">Choose option</option>
                {field.options.map(option => <option value={option} key={option}>{option}</option>)}
              </select>
            </label>
          )
        }
        if (field.type === 'Checkbox') {
          return <label className="check" key={field.id}><input type="checkbox" checked={form[field.id] === 'true'} onChange={event => setForm({ ...form, [field.id]: String(event.target.checked) })} /> {label}</label>
        }
        if (field.type === 'Multi-line text' || field.type === 'Multi-line text editor') {
          return <TextareaField key={field.id} label={label} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} placeholder={field.label} />
        }
        if (field.type === 'Simple list') {
          return <TextareaField key={field.id} label={label} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} placeholder="One item per line" />
        }
        if (field.type === 'Table') {
          return <TextareaField key={field.id} label={label} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} placeholder="Column 1, Column 2&#10;Value 1, Value 2" />
        }
        if (field.type === 'File upload' || field.type === 'Multiple files') {
          return <FileNameField key={field.id} field={field} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} />
        }
        if (field.type === 'Progress') {
          return <ProgressField key={field.id} label={label} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} />
        }
        if (field.type === 'Title - Separator') {
          return <div className="rw-record-separator" key={field.id}>{field.label}</div>
        }
        if (field.type === 'Single user' || field.type === 'Multiple users') {
          return <UserField key={field.id} field={field} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} />
        }
        if (field.type === 'Location') {
          return <LocationFieldControl key={field.id} label={label} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} />
        }
        if (isLinkedRecordField(field) && !field.linkedDatasetId) {
          return (
            <label className="rw-form-line" key={field.id}>
              {label}
              <span className="rw-link-error">An error occurred or the internal link field has been removed</span>
            </label>
          )
        }
        return <Field key={field.id} label={label} value={form[field.id]} onChange={value => setForm({ ...form, [field.id]: value })} type={inputType(field.type)} placeholder={primary ? `${field.label} *` : field.label} />
}

function TextareaField({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="rw-form-line wide">{label}<textarea value={value || ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>
}

function MultiOptionField({ field, value, onChange }: { field: DatasetField; value?: string; onChange: (value: string) => void }) {
  const selected = parseLinkedIds(value)
  return (
    <fieldset className="rw-multi-options">
      <legend>{field.label}{field.required ? ' *' : ''}</legend>
      {(field.options.length ? field.options : ['Option 1', 'Option 2']).map(option => (
        <label key={option}>
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={event => {
              const next = event.target.checked ? [...selected, option] : selected.filter(item => item !== option)
              onChange(next.join(','))
            }}
          />
          {option}
        </label>
      ))}
    </fieldset>
  )
}

function FileNameField({ field, value, onChange }: { field: DatasetField; value?: string; onChange: (value: string) => void }) {
  const files = fileUploads(value || '')
  const fileText = files.length
    ? files.map(file => file.name).join(', ')
    : field.type === 'Multiple files' ? 'Choose files' : 'Choose file'

  async function readFiles(files: FileList | null) {
    const selectedFiles = Array.from(files || [])
    const payload = await Promise.all(selectedFiles.map(async file => {
      const uploaded = await uploadDatasetFile(file)
      return {
        name: file.name,
        type: file.type,
        dataUrl: uploaded?.url || '',
        fileUrl: uploaded?.url || '',
        objectKey: uploaded?.objectKey || '',
        storageProvider: uploaded?.storageProvider || '',
      }
    }))
    onChange(JSON.stringify(payload))
  }

  return (
    <label className="rw-form-line rw-file-field">
      <span>{field.label}{field.required ? ' *' : ''}</span>
      <span className={files.length ? 'rw-file-picker has-file' : 'rw-file-picker'}>
        <UploadCloud size={18} />
        <strong>{fileText}</strong>
        <small>{field.label.toLowerCase().includes('image') ? 'Image upload' : 'File upload'}</small>
        <input
          type="file"
          accept={field.label.toLowerCase().includes('image') ? 'image/*' : undefined}
          multiple={field.type === 'Multiple files'}
          onChange={event => void readFiles(event.target.files)}
        />
      </span>
    </label>
  )
}

function FileUploadCell({ value }: { value: string }) {
  const uploads = fileUploads(value)
  if (!uploads.length) return value || '-'
  const imageUploads = uploads.filter(file => file.dataUrl)
  if (!imageUploads.length) return uploads.map(file => file.name).join(', ')
  return (
    <div className="record-file-thumbs">
      {imageUploads.slice(0, 3).map(file => (
        <a href={file.dataUrl} target="_blank" rel="noreferrer" title={file.name} key={`${file.name}-${file.dataUrl.slice(0, 24)}`}>
          <span style={{ backgroundImage: `url("${file.dataUrl}")` }} />
        </a>
      ))}
      {uploads.length > imageUploads.length && <span>{uploads.length - imageUploads.length} file{uploads.length - imageUploads.length === 1 ? '' : 's'}</span>}
    </div>
  )
}

function LocationCell({ value }: { value: string }) {
  if (!value) return '-'
  return <a className="record-location-link" href={googleMapsUrl(value)} target="_blank" rel="noreferrer" title={`Open pinned location: ${value}`}><LocateFixed size={13} /> {value}</a>
}

function ProgressField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  const progressValue = Number(value || 0)
  return (
    <label className="rw-progress-field">
      <span>{label}</span>
      <input type="range" min="0" max="100" value={Number.isFinite(progressValue) ? progressValue : 0} onChange={event => onChange(event.target.value)} />
      <b>{Number.isFinite(progressValue) ? progressValue : 0}%</b>
    </label>
  )
}

function UserField({ field, value, onChange }: { field: DatasetField; value?: string; onChange: (value: string) => void }) {
  const selected = parseLinkedIds(value)
  const users = ['Reymark Rabino', 'Current User']
  return (
    <label className="rw-form-line">
      {field.label}{field.required ? ' *' : ''}
      <select value={field.type === 'Multiple users' ? '' : value || ''} onChange={event => {
        if (field.type !== 'Multiple users') {
          onChange(event.target.value)
          return
        }
        onChange(Array.from(new Set([...selected, event.target.value].filter(Boolean))).join(','))
      }}>
        <option value="">Choose user</option>
        {users.map(user => <option value={user} key={user}>{user}</option>)}
      </select>
      {field.type === 'Multiple users' && selected.length > 0 && <small>{selected.join(', ')}</small>}
    </label>
  )
}

function LocationFieldControl({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  const query = normalizeLocationValue(value)
  const mapQuery = encodeURIComponent(query || 'Philippines')
  const mapsUrl = googleMapsUrl(query)
  const zoom = query ? 16 : 5

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(position => {
      onChange(`${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`)
    })
  }

  return (
    <div className="rw-location-field">
      <label>
        <span>{label}</span>
        <div>
          <LocateFixed size={16} />
          <input value={value || ''} onChange={event => onChange(event.target.value)} placeholder="Search address or paste coordinates" />
          <button type="button" onClick={useCurrentLocation}>Use current</button>
        </div>
      </label>
      <div className="rw-location-map">
        {query && <a href={mapsUrl} target="_blank" rel="noreferrer">Maps <LocateFixed size={13} /></a>}
        <iframe title={`${label} pinned map`} src={`https://maps.google.com/maps?q=${mapQuery}&z=${zoom}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      {query && <small>Saved pin: {query}</small>}
    </div>
  )
}

function RecordPeopleBox({ label, name }: { label: string; name: string }) {
  return (
    <div className="rw-people-box">
      <span>{label}</span>
      <div><Users size={16} /><b>{initials(name).slice(0, 1)}</b> {name} <X size={14} /></div>
    </div>
  )
}

function ViewForm({ dataset, form, setForm, onSubmit }: FormProps & { dataset: Dataset }) {
  return <form onSubmit={onSubmit} className="rw-form"><Field label="View name" value={form.name} onChange={value => setForm({ ...form, name: value })} required /><label className="rw-form-line">Filter field<select value={form.filterFieldId || ''} onChange={event => setForm({ ...form, filterFieldId: event.target.value })}><option value="">No filter</option>{dataset.fields.map(field => <option value={field.id} key={field.id}>{field.label}</option>)}</select></label><Field label="Filter value" value={form.filterValue} onChange={value => setForm({ ...form, filterValue: value })} /><FormActions /></form>
}

function ImportForm({ dataset, form, setForm, onSubmit }: FormProps & { dataset: Dataset }) {
  return <form onSubmit={onSubmit} className="rw-form"><p>Paste CSV or JSON rows for {dataset.name}. The first CSV row must contain column names.</p><label className="rw-form-line wide">Rows<textarea value={form.payload || ''} onChange={event => setForm({ ...form, payload: event.target.value })} placeholder={'Name,Status\nExample,Active'} required /></label><FormActions /></form>
}

function RelationshipForm({ datasets, form, setForm, onSubmit }: FormProps & { datasets: Dataset[] }) {
  const fromDataset = datasets.find(dataset => dataset.id === (form.fromDatasetId || datasets[0]?.id))
  return <form onSubmit={onSubmit} className="rw-form"><Field label="Label" value={form.label} onChange={value => setForm({ ...form, label: value })} required /><DatasetSelect label="From dataset" datasets={datasets} value={form.fromDatasetId} onChange={value => setForm({ ...form, fromDatasetId: value, fromFieldId: '' })} /><label className="rw-form-line">From field<select value={form.fromFieldId || ''} onChange={event => setForm({ ...form, fromFieldId: event.target.value })}><option value="">Choose field</option>{fromDataset?.fields.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select></label><DatasetSelect label="To dataset" datasets={datasets} value={form.toDatasetId} onChange={value => setForm({ ...form, toDatasetId: value })} /><FormActions /></form>
}

function AutomationForm({ datasets, form, setForm, onSubmit }: FormProps & { datasets: Dataset[] }) {
  return <form onSubmit={onSubmit} className="rw-form"><Field label="Name" value={form.name} onChange={value => setForm({ ...form, name: value })} required /><DatasetSelect label="Dataset" datasets={datasets} value={form.datasetId} onChange={value => setForm({ ...form, datasetId: value })} /><Field label="Trigger" value={form.trigger} onChange={value => setForm({ ...form, trigger: value })} placeholder="Record created" /><Field label="Action" value={form.action} onChange={value => setForm({ ...form, action: value })} placeholder="Create history event" /><FormActions /></form>
}

function QualityForm({ datasets, form, setForm, onSubmit }: FormProps & { datasets: Dataset[] }) {
  const dataset = datasets.find(item => item.id === (form.datasetId || datasets[0]?.id))
  return <form onSubmit={onSubmit} className="rw-form"><Field label="Rule name" value={form.name} onChange={value => setForm({ ...form, name: value })} /><DatasetSelect label="Dataset" datasets={datasets} value={form.datasetId} onChange={value => setForm({ ...form, datasetId: value, fieldId: '' })} /><label className="rw-form-line">Field<select value={form.fieldId || ''} onChange={event => setForm({ ...form, fieldId: event.target.value })}><option value="">Choose field</option>{dataset?.fields.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select></label><label className="rw-form-line">Rule type<select value={form.type || 'Required value'} onChange={event => setForm({ ...form, type: event.target.value })}>{['Required value', 'Unique value', 'Email format', 'Number format'].map(type => <option key={type}>{type}</option>)}</select></label><FormActions /></form>
}

function AccessKeyForm({ form, setForm, onSubmit }: FormProps) {
  return <form onSubmit={onSubmit} className="rw-form"><Field label="Key name" value={form.name} onChange={value => setForm({ ...form, name: value })} required /><label className="rw-form-line">Scope<select value={form.scope || 'Read datasets'} onChange={event => setForm({ ...form, scope: event.target.value })}><option>Read datasets</option><option>Read and write datasets</option><option>Admin datasets</option></select></label><FormActions /></form>
}

function FolderForm({ form, setForm, onSubmit }: FormProps) {
  return <form onSubmit={onSubmit} className="rw-form"><Field label="Folder name" value={form.name} onChange={value => setForm({ ...form, name: value })} required /><Field label="Description" value={form.description} onChange={value => setForm({ ...form, description: value })} /><FormActions /></form>
}

function DatasetSelect({ label, datasets, value, onChange }: { label: string; datasets: Dataset[]; value?: string; onChange: (value: string) => void }) {
  return <label className="rw-form-line">{label}<select value={value || ''} onChange={event => onChange(event.target.value)}><option value="">Choose dataset</option>{datasets.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}</select></label>
}

function Field({ label, value, onChange, required, placeholder, type = 'text' }: { label: string; value?: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; type?: string }) {
  return <label className="rw-form-line">{label}<input type={type} value={value || ''} onChange={event => onChange(event.target.value)} required={required} placeholder={placeholder} /></label>
}

function FormActions() {
  return <footer><button type="submit" className="primary">Save</button></footer>
}

function Modal({ title, children, onClose, wide, variant }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; variant?: ModalName }) {
  const className = `rw-modal${wide ? ' wide' : ''}${variant ? ` rw-modal-${variant}` : ''}`
  return <div className="rw-modal-backdrop" role="presentation" onMouseDown={onClose}><section className={className} onMouseDown={event => event.stopPropagation()}><header><h2>{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></header>{children}</section></div>
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <article className="rw-metric"><span>{icon}</span><strong>{value}</strong><p>{label}</p></article>
}

function EmptyState({ icon, title, detail, action, onAction }: { icon: ReactNode; title: string; detail: string; action?: string; onAction?: () => void }) {
  return (
    <StateFeedback
      className="rw-empty"
      icon={icon}
      title={title}
      message={detail}
      actions={action && onAction ? <button type="button" className="wf-state__primary primary" onClick={onAction}>{action}</button> : null}
    />
  )
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /></label>
}

function Progress({ value }: { value: number }) {
  return <span className="progress"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
}

function modalTitle(modal: ModalName) {
  return ({
    dataset: 'CREATE NEW DATASET',
    template: 'CHOOSE TEMPLATE',
    fieldPicker: 'Add fields',
    field: 'CREATE A NEW STANDARD FIELD',
    record: 'New record',
    view: 'New view',
    import: 'Import records',
    relationship: 'New relationship',
    automation: 'New automation',
    quality: 'New quality rule',
    key: 'New access key',
    folder: 'New folder',
  } as Record<string, string>)[modal || 'dataset']
}

function makeDataset(input: { name: string; description: string; folder: string; owner: string; source: string; fields: DatasetField[]; records: DatasetRecord[] }): Dataset {
  const createdAt = now()
  return {
    id: id('dataset'),
    name: input.name,
    description: input.description,
    status: 'ACTIVE',
    folder: input.folder || 'Uncategorized',
    owner: input.owner,
    source: input.source,
    fields: input.fields,
    records: input.records,
    views: [{ id: id('view'), name: 'TABLE', enabled: true, default: true }],
    createdAt,
    updatedAt: createdAt,
  }
}

function makeField(key: string, label: string, type: FieldType, required = false, options: string[] = [], linkedDatasetId?: string, extras: Partial<DatasetField> = {}): DatasetField {
  return { id: slugify(key || label), key: slugify(key || label), label, type, required, options, linkedDatasetId, ...extras }
}

function makeClientImportTemplateDataset(accountName: string): Dataset {
  const fields = [
    makeField('client_type', 'Client Type', 'Select', false, ['Commercial', 'Residential']),
    makeField('client_name', 'Client Name', 'Text', true),
    makeField('company_email', 'Company Email', 'Email', true),
    makeField('phone_number', 'Phone Number', 'Phone', true),
    makeField('company_website', 'Company Website', 'URL'),
    makeField('industry', 'Industry', 'Select', true, industryOptions),
    makeField('company_size', 'Company Size', 'Select', false, companySizeOptions),
    makeField('company_type', 'Company Type', 'Select', true, companyTypeOptions),
    makeField('tax_id_vat_number', 'Tax ID / VAT Number', 'Text'),
    makeField('annual_revenue', 'Annual Revenue', 'Select', false, annualRevenueOptions),
    makeField('billing_address', 'Billing Address', 'Long text'),
    makeField('account_manager', 'Account Manager', 'Single user'),
    makeField('default_currency', 'Default Currency', 'Select', true, ['PHP - Philippine Peso']),
    makeField('payment_terms', 'Payment Terms', 'Select', false, paymentTermOptions),
    makeField('description_notes', 'Description / Notes', 'Long text'),
    makeField('tags', 'Tags', 'Text'),
    makeField('status', 'Status', 'Select', false, ['Active', 'Inactive']),
  ]
  const createdAt = now()
  return makeDataset({
    name: clientImportTemplateName,
    description: 'Ready-to-import Client Database table using the Add Client form fields.',
    folder: 'CRM',
    owner: accountName,
    source: clientImportTemplateSource,
    fields,
    records: [{
      id: 'client-template-mcdonald',
      values: {
        client_type: 'Commercial',
        client_name: 'MCDonald',
        company_email: 'info@mcdo.com',
        phone_number: '09457850160',
        company_website: 'mcdo.com',
        industry: 'Marketing',
        company_size: '500+ employees',
        company_type: 'Corporation',
        tax_id_vat_number: '9632655356',
        annual_revenue: 'PHP 50M - PHP 100M',
        billing_address: '',
        account_manager: '',
        default_currency: 'PHP - Philippine Peso',
        payment_terms: '',
        description_notes: '',
        tags: 'Commercial, Marketing',
        status: 'Active',
      },
      createdBy: accountName,
      createdAt,
      updatedAt: createdAt,
    }],
  })
}

function applyClientImportTemplateFields(dataset: Dataset, accountName: string): Dataset {
  const template = makeClientImportTemplateDataset(dataset.owner || accountName)
  const templateFields = ensureDefaultDatasetFields(template.fields)
  const existingFields = dataset.fields
  const consumedFieldIds = new Set<string>()

  const restoredFields = templateFields.map(templateField => {
    const existingField = findMatchingField(existingFields, templateField, consumedFieldIds)
    if (!existingField) return templateField
    consumedFieldIds.add(existingField.id)
    return {
      ...existingField,
      label: templateField.label,
      type: templateField.type,
      required: templateField.required,
      options: [...templateField.options],
      linkedDatasetId: templateField.linkedDatasetId || existingField.linkedDatasetId,
      description: existingField.description || templateField.description,
    }
  })

  const extraFields = existingFields.filter(field => !consumedFieldIds.has(field.id))
  return {
    ...dataset,
    description: dataset.description || template.description,
    fields: [...restoredFields, ...extraFields],
    updatedAt: now(),
  }
}

function findMatchingField(fields: DatasetField[], templateField: DatasetField, consumedFieldIds: Set<string>) {
  const templateAliases = fieldAliases(templateField)
  return fields.find(field => !consumedFieldIds.has(field.id) && fieldAliases(field).some(alias => templateAliases.includes(alias)))
}

function fieldAliases(field: DatasetField) {
  return Array.from(new Set([field.id, field.key, field.label].map(value => slugify(value || '')).filter(Boolean)))
}

function defaultDatasetFields() {
  return [
    makeField('name', 'Name', 'Text', true),
    makeField('last_update', 'Last update', 'Date', false),
    makeField('created_at', 'Created at', 'Date', false),
    makeField('created_by', 'Created by', 'Single user', false),
  ]
}

function ensureDefaultDatasetFields(fields: DatasetField[]) {
  const existingIds = new Set(fields.map(field => field.id))
  const defaults = defaultDatasetFields()
  const missingDefaults = defaults.filter(field => !existingIds.has(field.id))
  const customFields = fields.filter(field => !defaults.some(defaultField => defaultField.id === field.id))
  return [...defaults.filter(field => existingIds.has(field.id)).map(field => fields.find(item => item.id === field.id) || field), ...missingDefaults, ...customFields]
}

function loadWorkspace(companyId: string, accountName: string): WorkspaceState {
  if (typeof window === 'undefined') return emptyState
  const stored = readJson<WorkspaceState>(companyScopedKey(storageKey, companyId))
  if (stored) {
    const normalized = normalizeWorkspace(stored, accountName)
    const ready = ensureClientImportTemplate(normalized, accountName)
    if (ready !== normalized) persistWorkspace(companyId, ready)
    return ready
  }
  const legacy = ensureClientImportTemplate(migrateLegacy(companyId, accountName), accountName)
  persistWorkspace(companyId, legacy)
  return legacy
}

function persistWorkspace(companyId: string, state: WorkspaceState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(companyScopedKey(storageKey, companyId), JSON.stringify(state))
}

function migrateLegacy(companyId: string, accountName: string): WorkspaceState {
  const legacyRows = readJson<unknown[]>(companyScopedKey(legacyStorageKey, companyId)) || readJson<unknown[]>(legacyStorageKey) || []
  const previousRows = readJson<unknown[]>(companyScopedKey(previousStorageKey, companyId)) || readJson<unknown[]>(previousStorageKey) || []
  const rows = [...legacyRows, ...previousRows]
  const datasets = rows.filter(isRecord).filter(row => text(row.id) !== 'sales-2785').map(row => legacyDatasetToDataset(row, accountName)).filter(Boolean) as Dataset[]
  return normalizeWorkspace({ ...emptyState, datasets }, accountName)
}

function legacyDatasetToDataset(row: StoredRow, accountName: string): Dataset | null {
  const name = text(row.name)
  if (!name) return null
  const createdAt = text(row.createdAt) || text(row.date) || now()
  const fields = readArray(row.fields).filter(isRecord).map(field => makeField(text(field.key || field.id || field.label), text(field.label || field.name || field.key), normalizeFieldType(text(field.type)), Boolean(field.required), readArray(field.options).map(text)))
  const records = readArray(row.records).filter(isRecord).map(record => ({
    id: text(record.id) || id('rec'),
    values: isRecord(record.values) ? Object.fromEntries(Object.entries(record.values).map(([key, value]) => [key, text(value)])) : {},
    createdBy: text(record.createdBy) || accountName,
    createdAt: text(record.createdAt) || createdAt,
    updatedAt: text(record.updatedAt || record.lastUpdate) || createdAt,
  }))
  return {
    id: text(row.id) || id('dataset'),
    name,
    description: text(row.description),
    status: text(row.status) === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
    folder: text(row.folder) || text(row.group) || 'Uncategorized',
    owner: text(row.owner) || accountName,
    source: text(row.source) || 'Manual',
    fields: ensureDefaultDatasetFields(fields.length ? fields : defaultDatasetFields()),
    records,
    views: ensureDefaultView(readArray(row.views).filter(isRecord).map(view => {
      const viewRecords = Array.isArray(view.records)
        ? (view.records as DatasetRecord[]).filter(rec => rec && typeof rec === 'object' && typeof (rec as DatasetRecord).id === 'string')
        : undefined
      return {
        id: text(view.id) || id('view'),
        name: text(view.name) || 'View',
        enabled: view.enabled !== false,
        default: Boolean(view.default),
        filterFieldId: text(view.filterFieldId) || undefined,
        filterValue: text(view.filterValue) || undefined,
        records: viewRecords,
      }
    })),
    createdAt,
    updatedAt: text(row.updatedAt) || createdAt,
  }
}

function normalizeWorkspace(input: Partial<WorkspaceState>, accountName: string): WorkspaceState {
  return {
    datasets: Array.isArray(input.datasets) ? input.datasets.filter(isDataset).map(dataset => ({ ...dataset, owner: dataset.owner || accountName, fields: ensureDefaultDatasetFields(dataset.fields), views: ensureDefaultView(dataset.views?.length ? dataset.views : [{ id: id('view'), name: 'TABLE', enabled: true, default: true }]) })) : [],
    folders: Array.isArray(input.folders) ? input.folders.filter(isRecord).map(folder => ({ id: text(folder.id) || id('folder'), name: text(folder.name), description: text(folder.description), createdAt: text(folder.createdAt) || now() })).filter(folder => folder.name) : [],
    relationships: Array.isArray(input.relationships) ? input.relationships.filter(isRecord) as Relationship[] : [],
    automations: Array.isArray(input.automations) ? input.automations.filter(isRecord) as Automation[] : [],
    qualityRules: Array.isArray(input.qualityRules) ? input.qualityRules.filter(isRecord) as QualityRule[] : [],
    accessKeys: Array.isArray(input.accessKeys) ? input.accessKeys.filter(isRecord) as AccessKey[] : [],
    settings: { ...emptyState.settings, ...input.settings, defaultOwner: input.settings?.defaultOwner || accountName },
    history: Array.isArray(input.history) ? input.history.filter(isRecord) as HistoryEvent[] : [],
  }
}

function ensureClientImportTemplate(state: WorkspaceState, accountName: string): WorkspaceState {
  const stateWithClientDropdowns = ensureClientDatasetDropdowns(state)
  const hasTemplate = stateWithClientDropdowns.datasets.some(isClientImportTemplateDataset)
  if (stateWithClientDropdowns.settings.clientDatasetTemplateSeeded || hasTemplate) {
    return stateWithClientDropdowns.settings.clientDatasetTemplateSeeded ? stateWithClientDropdowns : {
      ...stateWithClientDropdowns,
      settings: { ...stateWithClientDropdowns.settings, clientDatasetTemplateSeeded: true },
    }
  }

  const dataset = makeClientImportTemplateDataset(stateWithClientDropdowns.settings.defaultOwner || accountName)
  const folders = stateWithClientDropdowns.folders.some(folder => folder.name === 'CRM')
    ? stateWithClientDropdowns.folders
    : [{ id: 'folder_client_import_template_crm', name: 'CRM', description: 'Client import-ready datasets.', createdAt: dataset.createdAt }, ...stateWithClientDropdowns.folders]

  return {
    ...stateWithClientDropdowns,
    settings: { ...stateWithClientDropdowns.settings, clientDatasetTemplateSeeded: true },
    folders,
    datasets: [dataset, ...stateWithClientDropdowns.datasets],
    history: [{
      id: id('history'),
      action: 'Created dataset',
      detail: clientImportTemplateName,
      createdAt: dataset.createdAt,
    }, ...stateWithClientDropdowns.history],
  }
}

function ensureClientDatasetDropdowns(state: WorkspaceState): WorkspaceState {
  let changed = false
  const updatedAt = now()
  const datasets = state.datasets.map(dataset => {
    if (!isClientDatasetWithFormFields(dataset)) return dataset
    let datasetChanged = false
    const fields = dataset.fields.map(field => {
      const desiredOptions = clientDatasetDropdownOptions(field)
      if (!desiredOptions) return field
      const options = mergeOptions(field.options, desiredOptions)
      const shouldUpdate = field.type !== 'Select' || options.length !== field.options.length || options.some((option, index) => option !== field.options[index])
      if (!shouldUpdate) return field
      datasetChanged = true
      return { ...field, type: 'Select' as FieldType, options }
    })
    if (!datasetChanged) return dataset
    changed = true
    return { ...dataset, fields, updatedAt }
  })

  return changed ? { ...state, datasets } : state
}

function isClientDatasetWithFormFields(dataset: Dataset) {
  return isClientImportTemplateDataset(dataset)
    || dataset.source === 'Client Database'
    || dataset.name === 'Client Master'
}

function isClientImportTemplateDataset(dataset: Dataset) {
  return dataset.source === clientImportTemplateSource || dataset.name === clientImportTemplateName
}

function clientDatasetDropdownOptions(field: DatasetField) {
  const normalized = slugify(field.key || field.id || field.label)
  const label = field.label.trim().toLowerCase()
  if (normalized === 'payment_terms' || label === 'payment terms') return paymentTermOptions
  if (normalized === 'annual_revenue' || label === 'annual revenue') return annualRevenueOptions
  if (normalized === 'company_type' || label === 'company type') return companyTypeOptions
  if (normalized === 'company_size' || label === 'company size') return companySizeOptions
  if (normalized === 'industry' || label === 'industry') return industryOptions
  return null
}

function mergeOptions(existing: string[], desired: string[]) {
  const next = [...desired]
  existing.forEach(option => {
    if (option && !next.includes(option)) next.push(option)
  })
  return next
}

function isDataset(value: unknown): value is Dataset {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && typeof value.name === 'string' && Array.isArray(value.fields) && Array.isArray(value.records)
}

function qualityScore(dataset: Dataset, rules: QualityRule[]) {
  const checks: boolean[] = []
  dataset.fields.filter(field => field.required).forEach(field => dataset.records.forEach(record => checks.push(Boolean(record.values[field.id]?.trim()))))
  rules.filter(rule => rule.enabled && rule.datasetId === dataset.id).forEach(rule => {
    const values = dataset.records.map(record => record.values[rule.fieldId] || '')
    if (rule.type === 'Required value') values.forEach(value => checks.push(Boolean(value.trim())))
    if (rule.type === 'Unique value') checks.push(new Set(values.filter(Boolean)).size === values.filter(Boolean).length)
    if (rule.type === 'Email format') values.filter(Boolean).forEach(value => checks.push(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))
    if (rule.type === 'Number format') values.filter(Boolean).forEach(value => checks.push(Number.isFinite(Number(value))))
  })
  if (!checks.length) return dataset.records.length ? 96 : 82
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function validateDataset(dataset: Dataset, rules: QualityRule[]) {
  const errors: string[] = []
  const activeRules = rules.filter(rule => rule.enabled && rule.datasetId === dataset.id)
  const requiredFields = new Set([
    ...dataset.fields.filter(field => field.required).map(field => field.id),
    ...activeRules.filter(rule => rule.type === 'Required value').map(rule => rule.fieldId),
  ])

  requiredFields.forEach(fieldId => {
    const field = dataset.fields.find(item => item.id === fieldId)
    const missingCount = dataset.records.filter(record => !String(record.values[fieldId] || '').trim()).length
    if (missingCount) errors.push(`${field?.label || fieldId}: ${missingCount} record${missingCount === 1 ? '' : 's'} missing required value.`)
  })

  activeRules.forEach(rule => {
    const field = dataset.fields.find(item => item.id === rule.fieldId)
    const label = field?.label || rule.fieldId
    const values = dataset.records.map(record => String(record.values[rule.fieldId] || '').trim()).filter(Boolean)
    if (rule.type === 'Unique value' && new Set(values).size !== values.length) errors.push(`${label}: duplicate values are not allowed.`)
    if (rule.type === 'Email format' && values.some(value => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) errors.push(`${label}: one or more values are not valid email addresses.`)
    if (rule.type === 'Number format' && values.some(value => !Number.isFinite(Number(value)))) errors.push(`${label}: one or more values are not valid numbers.`)
  })

  return errors
}

function runAutomations(state: WorkspaceState, datasetId: string, trigger: string, detail: string): WorkspaceState {
  const matches = state.automations.filter(item => item.enabled && item.datasetId === datasetId && triggerMatchesAutomation(item.trigger, trigger))
  if (!matches.length) return state
  const createdAt = now()
  return {
    ...state,
    history: [
      ...matches.map(item => ({
        id: id('hist'),
        action: `Automation: ${item.name}`,
        detail: `${item.action} after ${trigger}. ${detail}`,
        createdAt,
      })),
      ...state.history,
    ].slice(0, 120),
  }
}

function triggerMatchesAutomation(configured: string, actual: string) {
  const left = configured.trim().toLowerCase()
  const right = actual.trim().toLowerCase()
  return !left || left === right || left.includes(right) || right.includes(left.replace('record ', ''))
}

function maskAccessToken(token: string) {
  if (!token) return 'No token'
  if (token.length <= 12) return `${token.slice(0, 4)}...`
  return `${token.slice(0, 8)}...${token.slice(-4)}`
}

function mergeFields(existing: DatasetField[], rows: StoredRow[]) {
  const fields = [...existing]
  const existingKeys = new Set(fields.map(field => field.key))
  rows.flatMap(row => Object.keys(row)).forEach(key => {
    const normalized = slugify(key)
    if (!existingKeys.has(normalized)) {
      fields.push(makeField(normalized, key, 'Text'))
      existingKeys.add(normalized)
    }
  })
  return fields
}

function parseRows(payload: string): StoredRow[] {
  const trimmed = payload.trim()
  if (!trimmed) return []
  const htmlRows = parseHtmlTableRows(trimmed)
  if (htmlRows.length) return htmlRows
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) return parsed.filter(isRecord)
    if (isRecord(parsed)) return [parsed]
  } catch {}
  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitDelimitedLine(lines[0])
  return lines.slice(1).map(line => {
    const cells = splitDelimitedLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
  })
}

function splitDelimitedLine(line: string) {
  if (line.includes('\t')) return line.split('\t').map(cell => cell.trim())
  const result: string[] = []
  let current = ''
  let quoted = false
  for (const char of line) {
    if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      result.push(current.trim())
      current = ''
    } else current += char
  }
  result.push(current.trim())
  return result
}

function parseHtmlTableRows(payload: string): StoredRow[] {
  if (!/<table[\s>]/i.test(payload)) return []
  const rowMatches = Array.from(payload.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map(match => match[1])
  if (rowMatches.length < 2) return []
  const tableRows = rowMatches.map(row => Array.from(row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)).map(cell => decodeHtml(cell[1].replace(/<[^>]+>/g, '').trim())))
  const headers = tableRows[0]
  return tableRows.slice(1).filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
}

const htmlEntityMap: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

function decodeHtml(value: string) {
  return value.replace(/&(#\d+|#x[\da-f]+|[a-z][a-z\d]+);/gi, (entity, rawName: string) => {
    const name = rawName.toLowerCase()
    if (name.startsWith('#x')) {
      return decodeCodePoint(entity, Number.parseInt(name.slice(2), 16))
    }
    if (name.startsWith('#')) {
      return decodeCodePoint(entity, Number.parseInt(name.slice(1), 10))
    }
    return htmlEntityMap[name] ?? entity
  })
}

function decodeCodePoint(fallback: string, codePoint: number) {
  if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return fallback
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) return fallback
  return String.fromCodePoint(codePoint)
}

function exportCellValue(record: DatasetRecord, field: DatasetField, dataset: Dataset, datasets: Dataset[]) {
  if (field.id === 'last_update') return formatGridDate(record.updatedAt)
  if (field.id === 'created_at') return formatGridDate(record.createdAt)
  if (field.id === 'created_by') return record.createdBy
  if (field.type === 'Rollup (beta)') return text(computeRollupValue(record, field, dataset, datasets))
  if (field.type === 'Lookup (beta)') return text(computeLookupValue(record, field, dataset, datasets))
  if (field.type === 'Custom formula') return text(computeFormulaValue(record, field))
  if (isLinkedRecordField(field)) return linkedRecordExportValue(record.values[field.id], field, datasets)
  if (field.type === 'File upload' || field.type === 'Multiple files') return exportFileCell(record.values[field.id])
  if (field.type === 'Location') {
    const value = record.values[field.id] || ''
    if (!value) return ''
    const mapsUrl = googleMapsUrl(value)
    return { text: mapsUrl, html: `<a href="${escapeAttribute(mapsUrl)}">${escapeHtml(value)}</a><br /><span>${escapeHtml(mapsUrl)}</span>` }
  }
  if (field.type === 'URL') {
    const value = record.values[field.id] || ''
    return value ? { text: value, html: `<a href="${escapeAttribute(value)}">${escapeHtml(value)}</a>` } : ''
  }
  return record.values[field.id] || ''
}

function linkedRecordExportValue(value: string, field: DatasetField, datasets: Dataset[]) {
  const linkedDataset = datasets.find(dataset => dataset.id === field.linkedDatasetId)
  if (!linkedDataset) return value || ''
  return parseLinkedIds(value).map(idValue => linkedDataset.records.find(record => record.id === idValue)).filter(Boolean).map(record => recordLabel(linkedDataset, record as DatasetRecord)).join(', ')
}

function exportFileCell(value?: string): ExportCell {
  const uploads = fileUploads(value)
  if (!uploads.length) return value || ''
  return {
    text: uploads.map(file => file.name).join(', '),
    html: uploads.map(file => {
      const href = file.dataUrl || file.name
      if (file.dataUrl && file.type.startsWith('image/')) {
        return `<a href="${escapeAttribute(href)}"><img src="${escapeAttribute(file.dataUrl)}" alt="${escapeAttribute(file.name)}" style="max-width:72px;max-height:54px;display:block;margin:2px 0;" /></a><br /><a href="${escapeAttribute(href)}">Open image: ${escapeHtml(file.name)}</a>`
      }
      return `<a href="${escapeAttribute(href)}">${escapeHtml(file.name)}</a>`
    }).join('<br />'),
  }
}

function downloadExcelTable(name: string, rows: ExportCell[][]) {
  if (typeof document === 'undefined') return
  const html = `<html><head><meta charset="utf-8" /></head><body><table>${rows.map(row => `<tr>${row.map(cell => exportTableCell(cell)).join('')}</tr>`).join('')}</table></body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${slugify(name) || 'dataset'}-records.xls`
  link.click()
  URL.revokeObjectURL(link.href)
}

function exportTableCell(cell: ExportCell) {
  if (typeof cell === 'string') return `<td>${escapeHtml(cell)}</td>`
  return `<td>${cell.html || escapeHtml(cell.text)}</td>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function loadRows(key: string, companyId: string): StoredRow[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(companyScopedKey(key, companyId)) || window.localStorage.getItem(key)
  const parsed = safeParse(raw)
  if (Array.isArray(parsed)) return parsed.filter(isRecord)
  if (isRecord(parsed) && Array.isArray(parsed.records)) return parsed.records.filter(isRecord)
  if (isRecord(parsed) && Array.isArray(parsed.items)) return parsed.items.filter(isRecord)
  if (isRecord(parsed) && Array.isArray(parsed.employees)) return parsed.employees.filter(isRecord)
  if (isRecord(parsed) && Array.isArray(parsed.inventory)) return parsed.inventory.filter(isRecord)
  return []
}

async function loadSourceRows(source: SourceDefinition, companyId: string): Promise<StoredRow[]> {
  const localRows = source.storageKeys.flatMap(key => loadRows(key, companyId))
  const serverRows = source.businessCollection && companyId
    ? await listBusinessRecords<StoredRow>(source.businessCollection, companyId).catch(() => [])
    : []
  return uniqueRows([...serverRows, ...localRows])
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = text(row.id) || text(row.email) || text(row.sku) || text(row.name ?? row.companyName ?? row.itemName) || `row-${index}`
    const normalized = key.toLowerCase()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function loadClientChoices(companyId: string): ClientChoice[] {
  const rows = loadRows('flowsys-clients', companyId)
  const seen = new Set<string>()
  return rows.flatMap((row, index) => {
    const label = text(row.name ?? row.clientName ?? row.companyName ?? row.company).trim()
    if (!label) return []
    const value = label
    const key = text(row.id) || `${value}-${index}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      value,
      label,
      detail: text(row.company || row.email || row.phone).trim(),
    }]
  }).sort((a, b) => a.label.localeCompare(b.label))
}

function readAccount() {
  if (typeof window === 'undefined') return { name: 'Current User', role: 'CEO' }
  const account = readJson<StoredRow>('flowsys-account') || readJson<StoredRow>('flowsys-auth-session') || {}
  return {
    name: text(account.fullName ?? account.name ?? account.displayName ?? account.email) || 'Current User',
    role: text(account.role ?? account.title ?? account.position) || 'CEO',
  }
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  return safeParse(window.localStorage.getItem(key)) as T | null
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is StoredRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field'
}

function uniqueKey(fields: DatasetField[], label: string) {
  const base = slugify(label)
  const keys = new Set(fields.map(field => field.id))
  if (!keys.has(base)) return base
  let index = 2
  while (keys.has(`${base}_${index}`)) index += 1
  return `${base}_${index}`
}

function parseOptions(value?: string) {
  return (value || '').split(',').map(item => item.trim()).filter(Boolean)
}

function ensureDefaultView(views: DatasetView[]) {
  if (!views.length) return [{ id: id('view'), name: 'All records', enabled: true, default: true }]
  const hasDefault = views.some(view => view.default)
  return views.map((view, index) => ({ ...view, default: hasDefault ? view.default : index === 0 }))
}

function normalizeFieldType(type: string): FieldType {
  if (fieldTypes.includes(type as FieldType)) return type as FieldType
  if (type.toLowerCase().includes('email')) return 'Email'
  if (type.toLowerCase().includes('phone')) return 'Phone'
  if (type.toLowerCase().includes('date')) return 'Date'
  if (type.toLowerCase().includes('number')) return 'Number'
  if (type.toLowerCase().includes('currency')) return 'Currency'
  if (type.toLowerCase().includes('checkbox')) return 'Checkbox'
  if (type.toLowerCase().includes('dropdown') || type.toLowerCase().includes('select')) return 'Select'
  if (type.toLowerCase().includes('link')) return 'Linked record'
  return 'Text'
}

function inputType(type: FieldType) {
  if (type === 'Date' || type === 'Date picker') return 'date'
  if (type === 'Date & time picker') return 'datetime-local'
  if (type === 'Time picker') return 'time'
  if (type === 'Number' || type === 'Currency' || type === 'Number, integer' || type === 'Number, with decimal-points' || type === 'Progress') return 'number'
  if (type === 'Email') return 'email'
  if (type === 'Phone' || type === 'Phone number') return 'tel'
  if (type === 'URL') return 'url'
  return 'text'
}

function isTimeField(field: DatasetField) {
  return field.type === 'Time picker' || field.type.toLowerCase().includes('time')
}

function isSingleSelectField(field: DatasetField) {
  return field.type === 'Select' || field.type === 'Dropdown, single'
}

function normalizeTime(value: string) {
  const [hours = '', minutes = ''] = value.split(':')
  if (!hours || !minutes) return value
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

function timeChoices() {
  const choices: string[] = []
  for (let hour = 12; hour <= 17; hour += 1) {
    for (const minute of ['00', '15', '30', '45']) {
      choices.push(`${String(hour).padStart(2, '0')}:${minute}`)
    }
  }
  return choices
}

function iconForType(type: FieldType) {
  if (type === 'Text' || type === 'Simple text') return <Text size={15} />
  if (type === 'Long text' || type.includes('Multi-line')) return <AlignLeft size={15} />
  if (type === 'Number' || type === 'Currency' || type.includes('Number') || type === 'Progress') return <Hash size={15} />
  if (type === 'Date' || type.includes('Date')) return <CalendarDays size={15} />
  if (type === 'Checkbox') return <CheckSquare size={15} />
  if (type === 'Select' || type.includes('Dropdown')) return <ListChecks size={15} />
  if (type === 'Client dropdown') return <Users size={15} />
  if (type === 'Email') return <Mail size={15} />
  if (type === 'Phone' || type === 'Phone number') return <Phone size={15} />
  if (type === 'URL' || type.includes('Link') || type.includes('Lookup')) return <Link2 size={15} />
  if (type.includes('user')) return <User size={15} />
  if (type.includes('file') || type.includes('File')) return <Paperclip size={15} />
  if (type === 'Table') return <Table2 size={15} />
  return <Text size={15} />
}

function formatValue(value: string, type: FieldType) {
  if (!value) return '-'
  if (type === 'Currency') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(parsed) : value
  }
  return value
}

function recordCellValue(record: DatasetRecord, field: DatasetField, dataset: Dataset, datasets: Dataset[]) {
  const storedValue = record.values[field.id]
  if (field.id === 'last_update') return formatGridDate(record.updatedAt)
  if (field.id === 'created_at') return formatGridDate(record.createdAt)
  if (field.id === 'created_by') {
    const creator = record.createdBy || dataset.owner || readAccount().name
    return <span className="record-user-cell"><i>{initials(creator).slice(0, 1)}</i>{creator}</span>
  }
  if (field.type === 'Rollup (beta)') return computeRollupValue(record, field, dataset, datasets)
  if (field.type === 'Lookup (beta)') return computeLookupValue(record, field, dataset, datasets)
  if (field.type === 'Custom formula') return computeFormulaValue(record, field)
  if (field.type === 'Single user' || field.type === 'Multiple users') return <UserAvatarCell value={storedValue} />
  if (isLinkedRecordField(field)) return linkedRecordDisplay(storedValue, field, datasets)
  if (field.type === 'Checkbox') return storedValue === 'true' ? <CheckSquare size={15} /> : '-'
  if (field.type === 'File upload' || field.type === 'Multiple files') return <FileUploadCell value={storedValue} />
  if (field.type === 'Location') return <LocationCell value={storedValue} />
  if (field.type === 'Progress') return <Progress value={Number(storedValue || 0)} />
  if (field.type === 'Title - Separator') return <strong>{field.label}</strong>
  if (field.type === 'URL' && storedValue) return <a href={storedValue} target="_blank" rel="noreferrer">{storedValue}</a>
  if (storedValue) return formatValue(storedValue, field.type)
  return formatValue(storedValue, field.type)
}

function compareRecordValues(left: DatasetRecord, right: DatasetRecord, field: DatasetField, dataset: Dataset, datasets: Dataset[], direction: SortDirection) {
  const leftValue = sortableRecordValue(left, field, dataset, datasets)
  const rightValue = sortableRecordValue(right, field, dataset, datasets)
  const factor = direction === 'asc' ? 1 : -1
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return (leftValue - rightValue) * factor
  return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' }) * factor
}

function sortableRecordValue(record: DatasetRecord, field: DatasetField, dataset: Dataset, datasets: Dataset[]) {
  if (field.id === 'last_update') return new Date(record.updatedAt).getTime() || 0
  if (field.id === 'created_at') return new Date(record.createdAt).getTime() || 0
  if (field.id === 'created_by') return record.createdBy || dataset.owner || ''
  if (field.type === 'Rollup (beta)') return text(computeRollupValue(record, field, dataset, datasets))
  if (field.type === 'Lookup (beta)') return text(computeLookupValue(record, field, dataset, datasets))
  if (field.type === 'Custom formula') return text(computeFormulaValue(record, field))
  if (isLinkedRecordField(field)) return linkedRecordExportValue(record.values[field.id], field, datasets)
  const value = record.values[field.id] || ''
  if (field.type.includes('Number') || field.type === 'Currency' || field.type === 'Progress') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (field.type.includes('Date')) return new Date(value).getTime() || 0
  return value
}

function emptyFilterRule(join: FilterJoin = 'AND'): FilterRule {
  return { id: id('filter'), fieldId: '', operator: 'contains', value: '', join }
}

function filterOperatorsForField(field?: DatasetField) {
  if (!field) return [{ value: 'contains' as FilterOperator, label: 'Contains' }, { value: 'not_contains' as FilterOperator, label: 'Not contains' }]
  if (field.id === 'last_update' || field.id === 'created_at' || field.type.includes('Date') || field.type.includes('Time')) {
    return [
      { value: 'is' as FilterOperator, label: 'Is' },
      { value: 'is_not' as FilterOperator, label: 'Is not' },
      { value: 'is_empty' as FilterOperator, label: 'Is empty' },
      { value: 'is_not_empty' as FilterOperator, label: 'Is not empty' },
    ]
  }
  return [
    { value: 'contains' as FilterOperator, label: 'Contains' },
    { value: 'not_contains' as FilterOperator, label: 'Not contains' },
    { value: 'is' as FilterOperator, label: 'Is' },
    { value: 'is_not' as FilterOperator, label: 'Is not' },
    { value: 'is_empty' as FilterOperator, label: 'Is empty' },
    { value: 'is_not_empty' as FilterOperator, label: 'Is not empty' },
  ]
}

function operatorNeedsNoValue(operator: FilterOperator) {
  return operator === 'is_empty' || operator === 'is_not_empty'
}

function normalizeLocationValue(value?: string) {
  return (value || '').trim().replace(/\s*,\s*/g, ',')
}

function googleMapsUrl(value: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalizeLocationValue(value))}`
}

function applyFilterRules(records: DatasetRecord[], dataset: Dataset, datasets: Dataset[], rules: FilterRule[]) {
  const activeRules = rules.filter(rule => rule.fieldId)
  if (!activeRules.length) return records
  return records.filter(record => {
    let result = matchesFilterRule(record, dataset, datasets, activeRules[0])
    activeRules.slice(1).forEach(rule => {
      const next = matchesFilterRule(record, dataset, datasets, rule)
      result = rule.join === 'OR' ? result || next : result && next
    })
    return result
  })
}

function matchesFilterRule(record: DatasetRecord, dataset: Dataset, datasets: Dataset[], rule: FilterRule) {
  const field = dataset.fields.find(item => item.id === rule.fieldId)
  if (!field) return true
  const rawValue = String(sortableRecordValue(record, field, dataset, datasets) || '')
  const value = rawValue.toLowerCase()
  const expected = rule.value.toLowerCase()
  if (rule.operator === 'is_empty') return !rawValue.trim()
  if (rule.operator === 'is_not_empty') return Boolean(rawValue.trim())
  if (rule.operator === 'is') return value === expected
  if (rule.operator === 'is_not') return value !== expected
  if (rule.operator === 'not_contains') return !value.includes(expected)
  return value.includes(expected)
}

function UserAvatarCell({ value }: { value?: string }) {
  const users = parseLinkedIds(value)
  if (!users.length) return '-'
  return (
    <span className="record-users-cell">
      {users.map(user => (
        <span className="record-user-avatar" title={user} aria-label={user} key={user}>
          {initials(user).slice(0, 1)}
        </span>
      ))}
    </span>
  )
}

function isLinkedRecordField(field: DatasetField) {
  return field.type === 'Link to another record (beta)' || field.type === 'Link dataset record' || field.type === 'Linked record' || field.type === 'Link service record (Beta)'
}

function isComputedField(field: DatasetField) {
  return field.type === 'Rollup (beta)' || field.type === 'Lookup (beta)' || field.type === 'Custom formula'
}

function isSystemField(field: DatasetField) {
  return ['last_update', 'created_at', 'created_by'].includes(field.id)
}

function parseLinkedIds(value?: string) {
  return (value || '').split(',').map(item => item.trim()).filter(Boolean)
}

function fileUploads(value?: string) {
  const parsed = safeParse(value || '')
  if (Array.isArray(parsed)) {
    return parsed.filter(isRecord).map(file => ({
      name: text(file.name),
      type: text(file.type),
      dataUrl: text(file.dataUrl),
      fileUrl: text(file.fileUrl),
      objectKey: text(file.objectKey),
      storageProvider: text(file.storageProvider),
    })).filter(file => file.name)
  }
  return (value || '').split(',').map(name => ({ name: name.trim(), type: '', dataUrl: '', fileUrl: '', objectKey: '', storageProvider: '' })).filter(file => file.name)
}

async function uploadDatasetFile(file: File) {
  try {
    return await uploadFileObject(file, 'dataset-uploads')
  } catch {
    return undefined
  }
}

function recordLabel(dataset: Dataset, record: DatasetRecord) {
  const primaryField = dataset.fields.find(field => field.id === 'name') || dataset.fields[0]
  return primaryField ? record.values[primaryField.id] || record.id : record.id
}

function linkedRecordDisplay(value: string, field: DatasetField, datasets: Dataset[]) {
  const linkedDataset = datasets.find(dataset => dataset.id === field.linkedDatasetId)
  if (!linkedDataset || !value) return value || '-'
  const labels = parseLinkedIds(value).map(idValue => linkedDataset.records.find(record => record.id === idValue)).filter(Boolean).map(record => recordLabel(linkedDataset, record as DatasetRecord))
  return labels.length ? labels.join(', ') : value
}

function computeRollupValue(record: DatasetRecord, field: DatasetField, dataset: Dataset, datasets: Dataset[]) {
  const sourceField = dataset.fields.find(item => item.id === field.rollupSourceFieldId)
  const linkedDataset = datasets.find(item => item.id === sourceField?.linkedDatasetId || item.id === field.linkedDatasetId)
  if (!sourceField || !linkedDataset) return '-'
  const linkedIds = parseLinkedIds(record.values[sourceField.id])
  const linkedRecords = linkedDataset.records.filter(item => linkedIds.includes(item.id))
  const values = field.rollupFieldId ? linkedRecords.map(item => item.values[field.rollupFieldId || '']).filter(Boolean) : linkedRecords.map(item => item.id)
  const aggregate = field.aggregateFunction || 'Count'
  if (aggregate === 'Count') return String(values.length)
  const numbers = values.map(Number).filter(Number.isFinite)
  if (!numbers.length) return '-'
  if (aggregate === 'Min') return String(Math.min(...numbers))
  if (aggregate === 'Max') return String(Math.max(...numbers))
  if (aggregate === 'Sum') return String(numbers.reduce((sum, value) => sum + value, 0))
  if (aggregate === 'Average') return String(Math.round((numbers.reduce((sum, value) => sum + value, 0) / numbers.length) * 100) / 100)
  return values.join(', ')
}

function computeLookupValue(record: DatasetRecord, field: DatasetField, dataset: Dataset, datasets: Dataset[]) {
  const sourceField = dataset.fields.find(item => item.id === field.rollupSourceFieldId || isLinkedRecordField(item))
  const linkedDataset = datasets.find(item => item.id === sourceField?.linkedDatasetId || item.id === field.linkedDatasetId)
  if (!sourceField || !linkedDataset || !field.rollupFieldId) return '-'
  return parseLinkedIds(record.values[sourceField.id])
    .map(idValue => linkedDataset.records.find(item => item.id === idValue)?.values[field.rollupFieldId || ''])
    .filter(Boolean)
    .join(', ') || '-'
}

function computeFormulaValue(record: DatasetRecord, field: DatasetField) {
  if (!field.formula) return '-'
  return field.formula.replace(/\{([^}]+)\}/g, (_match, key: string) => record.values[slugify(key)] || '')
}

function nameOf(datasets: Dataset[], datasetId: string) {
  return datasets.find(dataset => dataset.id === datasetId)?.name || 'Unknown dataset'
}

function fieldNameOf(datasets: Dataset[], datasetId: string, fieldId: string) {
  return datasets.find(dataset => dataset.id === datasetId)?.fields.find(field => field.id === fieldId)?.label || 'Unknown field'
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'DS'
}

function now() {
  return new Date().toISOString()
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateOnly(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '-'
  return date.toLocaleDateString('en-GB').replace(/\//g, '-')
}

function formatGridDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '-'
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${time} ${formatDateOnly(value)}`
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function randomToken() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(18)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

const styles = `
.rw-app{height:100vh;background:#f3f4f6;color:#111827;font-family:var(--font-body);font-size:14px;overflow:hidden}
.rw-app *{box-sizing:border-box}
.rw-topbar{height:62px;background:#fff;color:#111827;border-bottom:1px solid #e5e7eb;display:grid;grid-template-columns:240px minmax(360px,505px) minmax(260px,1fr);align-items:center;gap:18px;padding:0 18px}
.rw-top-left,.rw-top-actions{display:flex;align-items:center;gap:10px}
.rw-product-mark{width:34px;height:34px;border-radius:999px;background:#d8f9e4;color:#1bc966;border:1px solid #a9efc6;display:grid;place-items:center}
.rw-top-left strong,.rw-top-left small{display:block;line-height:1.15}
.rw-top-left strong{font-size:15px;color:#0f172a}
.rw-top-left small{color:#64748b;font-size:12px;margin-top:2px}
.rw-global-search{height:36px;background:#fff;border:1px solid #dfe4ec;border-radius:7px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#0f172a;box-shadow:0 1px 2px rgba(15,23,42,.03)}
.rw-global-search input{width:100%;border:0;outline:0;background:transparent;color:#111827;font:inherit;font-size:13px}
.rw-global-search input::placeholder{color:#94a3b8}
.rw-top-actions{justify-self:end;color:#0f172a;font-size:13px}
.rw-top-actions > span{width:36px;height:36px;border:3px solid #d9f7e4;border-radius:999px;background:#20c75a;color:#0a2112;display:inline-grid;place-items:center;font-size:12px;font-weight:900}
.rw-notification{position:relative!important;width:36px!important;height:36px!important;min-height:36px!important;border-radius:999px!important;background:#fff!important;color:#0f172a!important;padding:0!important}
.rw-notification em{position:absolute;top:-6px;right:-5px;width:17px;height:17px;border-radius:999px;background:#ff1f1f;color:#fff;border:1px solid #fff;display:grid;place-items:center;font-size:9px;font-style:normal;font-weight:900}
.rw-top-secondary{height:34px!important;min-height:34px!important;border:1px solid #d7dee8!important;border-radius:999px!important;background:#fff!important;color:#0f172a!important;padding:0 14px!important;font-size:12px!important;font-weight:900!important;white-space:nowrap}
.rw-top-primary{height:34px!important;min-height:34px!important;border-color:#22c55e!important;border-radius:999px!important;background:#22c55e!important;color:#001b0b!important;padding:0 16px!important;font-size:12px!important;font-weight:900!important;white-space:nowrap}
.rw-body{display:grid;grid-template-columns:257px minmax(0,1fr);height:100vh}
.rw-workspace-panel{background:#000!important;color:#e5e7eb!important;min-width:0;height:100vh;overflow:auto;padding:21px 26px 18px;border-color:#242424!important}
.rw-panel-brand{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:10px;margin:0 0 18px;padding:0;background:#000!important}
.rw-panel-brand>span{width:34px;height:34px;border-radius:8px;background:#0f838a!important;color:#fff!important;display:block}
.rw-panel-brand strong{display:block;font-size:15px;line-height:1;font-weight:900;color:#f8fafc!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-panel-brand small{display:block;margin-top:5px;color:#fff!important;font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-back-dashboard{min-height:38px;margin:0 0 16px;border:1px solid rgba(148,163,184,.26);border-radius:8px;background:rgba(255,255,255,.04);color:#fff!important;display:flex;align-items:center;gap:9px;padding:0 10px;text-decoration:none;font-size:13px;font-weight:900}
.rw-back-dashboard svg{color:#fff!important;stroke:#fff!important;flex:0 0 auto}
.rw-back-dashboard:hover{background:rgba(255,255,255,.09)}
.rw-back-link{min-height:38px;border:1px solid rgba(148,163,184,.22);border-radius:8px;display:flex;align-items:center;gap:9px;padding:0 10px;color:#e2e8f0!important;text-decoration:none;font-size:13px;font-weight:850;background:rgba(255,255,255,.03);margin:0 0 14px}
.rw-back-link svg{color:#e2e8f0!important;stroke:#e2e8f0!important;flex:0 0 auto}
.rw-back-link:hover{background:rgba(255,255,255,.07);text-decoration:none}
.rw-panel-label{color:#94a3b8!important;background:#000!important;font-size:10px;font-weight:900;letter-spacing:.8px;margin:0 0 6px;padding:0 10px;text-transform:uppercase}
.rw-panel-nav{display:grid;gap:4px;background:#000!important}
.rw-panel-nav a,.rw-panel-nav button{width:100%;min-height:38px!important;border:0!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;background:transparent!important;color:#a1a1aa!important;text-decoration:none;font-size:13px!important;font-weight:800!important;padding:0 10px!important;border-radius:8px!important}
.rw-panel-nav a svg,.rw-panel-nav button svg{width:16px;color:#94a3b8!important;stroke:#94a3b8!important;flex:0 0 auto}
.rw-panel-nav a:hover,.rw-panel-nav button:hover{background:rgba(255,255,255,.06)!important;color:#f8fafc!important}
.rw-panel-nav a:hover svg,.rw-panel-nav button:hover svg{color:#f8fafc!important;stroke:#f8fafc!important}
.rw-panel-nav a.active,.rw-panel-nav button.active{background:#242424!important;color:#fff!important}
.rw-panel-nav a.active svg,.rw-panel-nav button.active svg{color:#fff!important;stroke:#fff!important}
.rw-simple-nav{gap:8px!important}
.rw-simple-nav .rw-folder-group{
  width:100%;
  min-height:34px;
  border:0;
  border-radius:0;
  border-top:1px solid rgba(148,163,184,.18);
  background:#000!important;
  color:#94a3b8!important;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:10px 10px 6px;
  text-transform:uppercase;
  font-size:11px;
  font-weight:900;
  letter-spacing:0;
}
.rw-simple-nav .rw-folder-group:first-of-type{margin-top:22px;border-top:0}
.rw-simple-nav .rw-folder-group svg{color:#94a3b8!important;stroke:#94a3b8!important}
.rw-simple-nav .rw-sales-link{
  min-height:30px;
  width:100%;
  border:0;
  border-radius:0;
  padding-left:10px;
  color:#cbd5e1!important;
  background:#000!important;
  display:flex!important;
  align-items:center;
  justify-content:flex-start;
  gap:10px;
  text-decoration:none;
}
.rw-simple-nav .rw-sales-link b{
  width:18px;
  height:18px;
  border-radius:3px;
  background:#d34b53;
  color:#fff;
  display:grid;
  place-items:center;
  font-size:11px;
  line-height:1;
  font-weight:900;
}
.rw-simple-nav .rw-sales-link.active{color:#fff!important;background:#242424!important;border-radius:8px}
.rw-sidebar-folders{display:grid;gap:16px;margin-top:86px;background:#000!important}
.rw-sidebar-folders section{display:grid;gap:8px;background:#000!important}
.rw-sidebar-folder-head{width:100%;min-height:34px!important;border:0!important;border-bottom:1px solid rgba(148,163,184,.25)!important;border-radius:0!important;background:#000!important;color:#9fb2c7!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 10px!important;text-transform:uppercase;font-size:11px!important;font-weight:900!important}
.rw-sidebar-folder-head span{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-sidebar-folder-head svg{color:#9fb2c7!important;stroke:#9fb2c7!important;flex:0 0 auto}
.rw-sidebar-folders section>button:not(.rw-sidebar-folder-head){width:100%;min-height:30px!important;border:0!important;border-radius:8px!important;background:#000!important;color:#dbeafe!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;padding:0 10px!important;font-size:13px!important;font-weight:800!important;text-align:left}
.rw-sidebar-folders section>button:not(.rw-sidebar-folder-head):hover{background:rgba(255,255,255,.06)!important;color:#fff!important}
.rw-sidebar-folders section>button.active:not(.rw-sidebar-folder-head){background:#242424!important;color:#fff!important}
.rw-sidebar-folders b{width:18px;height:18px;border-radius:3px;background:#d34b53;color:#fff;display:grid;place-items:center;font-size:11px;line-height:1;font-weight:900;flex:0 0 auto}
.rw-main{min-width:0;overflow:hidden;background:#fff;display:grid;grid-template-rows:62px minmax(0,1fr)}
.rw-titlebar{height:86px;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:14px;padding:0 24px}
.rw-dataset-icon{width:32px;height:32px;border-radius:7px;background:#c34d57;color:#fff;display:grid;place-items:center;font-weight:900}
.rw-titlebar p{margin:0 0 5px;color:#64748b;font-size:12px;font-weight:800}
.rw-titlebar h1{margin:0;font-size:24px;line-height:1.1}
.rw-title-actions{display:flex;align-items:center;gap:10px}
.rw-title-actions label{height:36px;border:1px solid #d7dde6;background:#fff;border-radius:6px;display:flex;align-items:center;gap:7px;padding:0 10px;color:#64748b}
.rw-title-actions input{border:0;outline:0;background:transparent;font:inherit;width:160px}
.rw-app button,.rw-app select,.rw-app input,.rw-app textarea{font:inherit}
.rw-app button{min-height:34px;border:1px solid #d7dde6;background:#fff;border-radius:6px;color:#111827;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 12px;font-size:13px;cursor:pointer}
.rw-app button.create,.rw-app button.primary,.primary{background:#1eb200!important;border-color:#1eb200!important;color:#fff!important;font-weight:800}
.rw-app button.danger,.danger{color:#dc2626!important}
.rw-dataset-screen{height:calc(100vh - 62px);display:grid;grid-template-rows:auto auto auto minmax(0,1fr);overflow:hidden;background:#fff;border-top:6px solid #0f838a}
.rw-management-page{height:calc(100vh - 62px);background:#f3f4f6;color:#111827;overflow:auto;padding-inline:max(0px,calc((100% - var(--wf-content-max)) / 2))}
.rw-datasets-management-page{background:#fff;border-top:8px solid #0f838a}
.rw-management-header{height:78px;border-bottom:1px solid #ddd;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 20px}
.rw-datasets-management-page .rw-management-header{height:84px;padding:0 20px}
.rw-management-title{display:grid;grid-template-columns:28px minmax(0,1fr);gap:13px;align-items:start}
.rw-management-title svg{color:#8a8a8a;margin-top:3px}
.rw-management-title h1{margin:0;color:#111;font-size:25px;line-height:1.05;font-weight:900}
.rw-management-title p{margin:8px 0 0;color:#969696;font-size:14px}
.rw-management-actions{display:flex;align-items:center;gap:12px}
.rw-management-actions label{height:32px;width:150px;border:1px solid #d6d6d6;background:#fff;display:flex;align-items:center;gap:8px;padding:0 9px;color:#999}
.rw-management-actions input{min-width:0;width:100%;border:0;outline:0;background:transparent;font-size:13px}
.rw-management-actions button{height:32px;min-height:32px;border:0;border-radius:3px;background:#128696;color:#fff;font-size:13px;font-weight:850;padding:0 15px}
.rw-datasets-management-page .rw-management-actions label{width:150px}
.rw-datasets-management-page .rw-management-actions button{width:66px}
.rw-management-table{background:#f7f7f7}
.rw-datasets-management-page .rw-management-table{background:#fff;padding:0 20px 24px}
.rw-management-row{width:100%;min-height:66px;border:0;border-bottom:1px solid #e0e0e0;border-radius:0;background:#fff;color:#111;display:grid!important;grid-template-columns:minmax(340px,1fr) 120px 150px 150px 42px;align-items:center;gap:0;padding:0 20px;text-align:left}
.rw-datasets-management-page .rw-management-row{min-height:57px;grid-template-columns:minmax(420px,1fr) 120px 130px 130px 36px;padding:0 20px}
.rw-management-row.head{min-height:49px;background:#fff;color:#999;font-size:12px;font-weight:900;pointer-events:none}
.rw-datasets-management-page .rw-management-row.head{min-height:50px}
.rw-management-row:not(.head){cursor:pointer}
.rw-management-row:not(.head):hover{background:#fbfbfb}
.rw-management-row .dataset{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:14px}
.rw-management-row .dataset b{width:30px;height:30px;border-radius:6px;color:#fff;display:grid;place-items:center}
.rw-management-row .dataset b.gold{background:#a28b00}
.rw-management-row .dataset b.red{background:#c34d57}
.rw-management-row .dataset strong{display:block;color:#111;font-size:15px;font-weight:800}
.rw-management-row .dataset small{display:block;margin-top:5px;color:#888;font-size:13px}
.rw-management-row em{width:max-content;border-radius:4px;background:#1ec83c;color:#fff;font-style:normal;font-size:12px;font-weight:900;padding:5px 8px}
.rw-management-row .owner i{width:26px;height:26px;border-radius:999px;background:#9290ee;color:#fff;display:grid;place-items:center;font-style:normal;font-weight:900}
.rw-datasets-management-page .rw-management-row .owner i{margin-left:4px}
.rw-management-row .more{color:#999;display:grid;place-items:center}
.rw-folders-page{height:calc(100vh - 62px);background:#f3f4f6;color:#111827;overflow:auto;padding-inline:max(0px,calc((100% - var(--wf-content-max)) / 2))}
.rw-folder-list-card{width:min(1000px,calc(100% - 64px));margin:20px auto 48px;background:#fff;border:1px solid #e8e8e8;border-radius:3px;box-shadow:0 2px 5px rgba(15,23,42,.08);overflow:hidden}
.rw-folder-list-row{min-height:65px;display:grid;grid-template-columns:minmax(360px,1fr) 330px 38px;align-items:center;border-bottom:1px solid #ececec;padding:0 20px;gap:16px}
.rw-folder-list-row:last-child{border-bottom:0}
.rw-folder-list-row.head{min-height:45px;color:#999;font-size:11px;font-weight:900;text-transform:uppercase}
.rw-folder-list-row .folder-name{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:14px}
.rw-folder-list-row .folder-name svg{color:#8b8b8b;stroke-width:1.8}
.rw-folder-list-row strong{display:block;color:#111;font-size:14px;font-weight:900;line-height:1.1}
.rw-folder-list-row small{display:block;margin-top:6px;color:#777;font-size:13px;line-height:1.1}
.rw-folder-list-row .folder-creator{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:10px}
.rw-folder-list-row .folder-creator i{width:32px;height:32px;border-radius:999px;background:#9290ee;color:#fff;display:grid;place-items:center;font-style:normal;font-weight:900}
.rw-folder-list-row>button{width:28px!important;height:28px!important;min-height:28px!important;border:0!important;background:transparent!important;color:#999!important;padding:0!important}
.rw-folder-empty{min-height:170px;display:grid;place-items:center;align-content:center;gap:8px;color:#8a8a8a}
.rw-folder-empty strong{color:#111;font-size:15px}
.rw-folder-empty span{font-size:13px}
.rw-dataset-detail-header{height:80px;border-bottom:1px solid #e5e5e5;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 20px}
.rw-dataset-detail-title{display:flex;align-items:center;gap:14px;min-width:0}
.rw-dataset-detail-title b{width:30px;height:30px;border-radius:5px;background:#c34d57;color:#fff;display:grid;place-items:center;flex:0 0 auto}
.rw-dataset-detail-title h1{margin:0;font-size:24px;line-height:1.1;font-weight:900;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-dataset-detail-actions{display:flex;align-items:center;gap:10px;min-width:0}
.rw-dataset-detail-actions>button{height:32px!important;min-height:32px!important;border-radius:3px!important;font-size:12px!important;font-weight:850!important}
.rw-dataset-detail-actions label{height:32px;width:210px;border:1px solid #d6d6d6;background:#fff;display:flex;align-items:center;gap:8px;padding:0 9px;color:#999}
.rw-dataset-detail-actions input{min-width:0;width:100%;border:0;outline:0;background:transparent;font-size:12px}
.rw-dataset-detail-actions .primary{background:#1eb200!important;border-color:#1eb200!important;border-radius:3px!important;min-width:120px!important}
.rw-viewbar{height:34px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;gap:16px;padding:0 20px;background:#fff}
.rw-viewbar button{height:34px;min-height:34px;border:0;border-radius:0;background:transparent;color:#666;padding:0 2px;font-size:13px}
.rw-viewbar button.active{color:#111;border-bottom:2px solid #111;font-weight:800}
.rw-viewbar .view-delete{width:18px;height:18px;margin-left:6px;border-radius:4px;display:inline-grid;place-items:center;color:#777;vertical-align:middle}
.rw-viewbar .view-delete:hover{background:#f3f4f6;color:#111}
.rw-grid-actions{height:38px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;gap:18px;padding:0 32px;background:#fff}
.rw-grid-actions span{color:#777;font-size:12px;margin-right:auto}
.rw-grid-actions button{height:28px;min-height:28px;border:0;background:transparent;color:#111;padding:0 2px;font-size:12px;font-weight:800}
.rw-grid-actions button.active{height:28px!important;min-height:28px!important;border:1px solid #8ac7ef!important;border-radius:2px!important;background:#e9f6ff!important;color:#0780a2!important;padding:0 10px!important}
.rw-row-height-control{position:relative;display:flex;align-items:center}
.rw-row-height-menu{position:absolute;left:0;top:31px;z-index:30;width:122px;background:#fff;border:1px solid #e5e5e5;box-shadow:0 6px 18px rgba(15,23,42,.16);padding:8px 0}
.rw-row-height-menu button{width:100%;height:32px!important;min-height:32px!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;justify-content:space-between!important;padding:0 16px 0 20px!important;font-weight:500!important}
.rw-row-height-menu button:hover{background:#f4f4f4!important}
.rw-row-height-menu button svg{color:#20b80d}
.rw-row-height-menu button:last-child{color:#20b80d!important;font-weight:800!important}
.rw-sort-control{position:relative;display:flex;align-items:center}
.rw-sort-popover{position:absolute;left:-30px;top:31px;z-index:35;width:232px;background:#fff;border:1px solid #e5e5e5;box-shadow:0 8px 22px rgba(15,23,42,.18);color:#111}
.rw-sort-popover header{height:48px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 20px}
.rw-sort-popover h3{margin:0;font-size:20px;font-weight:500}
.rw-sort-popover header button{width:28px!important;height:28px!important;min-height:28px!important;border:0!important;background:transparent!important;color:#777!important;padding:0!important}
.rw-sort-search{height:32px;margin:8px 10px;border:1px solid #d7d7d7;display:flex;align-items:center;gap:8px;padding:0 10px;color:#a0a0a0}
.rw-sort-search input{width:100%;border:0;outline:0;background:transparent;font-size:13px}
.rw-sort-fields{display:grid;max-height:245px;overflow:auto;padding:4px 0 10px}
.rw-sort-fields button{height:34px!important;min-height:34px!important;border:0!important;border-radius:0!important;background:#fff!important;color:#6f6f6f!important;justify-content:flex-start!important;padding:0 20px!important;font-size:14px!important;font-weight:500!important}
.rw-sort-fields button svg{width:15px;height:15px;color:#777}
.rw-sort-fields button.active,.rw-sort-fields button:hover{background:#f4f4f4!important;color:#111!important}
.rw-sort-fields button.active svg:last-child{margin-left:auto;color:#20b80d}
.rw-sort-direction{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid #eee;padding:10px}
.rw-sort-direction button{height:30px!important;min-height:30px!important;border:1px solid #d8d8d8!important;border-radius:2px!important;background:#fff!important;color:#111!important}
.rw-sort-direction button.active{background:#e9f6ff!important;border-color:#8ac7ef!important;color:#0780a2!important}
.rw-sort-popover footer{height:52px;border-top:1px solid #e5e5e5;background:#f6f6f6;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 20px}
.rw-sort-popover footer button{height:30px!important;min-height:30px!important;border-radius:2px!important;padding:0 13px!important;font-size:13px!important}
.rw-sort-popover footer .primary{background:#128696!important;border-color:#128696!important;color:#fff!important}
.rw-filter-control{position:relative;display:flex;align-items:center}
.rw-filter-popover{position:absolute;left:-100px;top:31px;z-index:34;width:720px;background:#fff;border:1px solid #dcdcdc;box-shadow:0 8px 22px rgba(15,23,42,.16);color:#111}
.rw-filter-popover header{height:42px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;padding:0 16px 0 20px}
.rw-filter-popover h3{margin:0;font-size:20px;font-weight:500}
.rw-filter-popover header button{width:28px!important;height:28px!important;min-height:28px!important;border:0!important;background:transparent!important;color:#777!important;padding:0!important}
.rw-filter-rules{display:grid;gap:10px;padding:22px 42px 18px}
.rw-filter-rule{display:grid;grid-template-columns:58px 180px 150px 200px 28px;align-items:center;gap:10px}
.rw-filter-rule>span{font-size:12px;font-weight:700;text-align:right}
.rw-filter-rule>span select{height:34px;border:1px solid #d7d7d7;background:#fff;padding:0 12px}
.rw-filter-rule>input{height:34px;border:1px solid #d7d7d7;background:#fff;padding:0 10px;outline:0}
.rw-filter-rule>button{width:28px!important;height:28px!important;min-height:28px!important;border:0!important;background:transparent!important;color:#111!important;padding:0!important}
.rw-filter-picker{position:relative}
.rw-filter-picker>button{width:100%;height:34px!important;min-height:34px!important;border:1px solid #cfd3d8!important;border-radius:0!important;background:#fff!important;color:#777!important;justify-content:space-between!important;padding:0 9px!important;font-size:14px!important;font-weight:500!important}
.rw-filter-picker>button.active{border-color:#0d91a3!important}
.rw-filter-dropdown{position:absolute;left:0;top:36px;z-index:40;width:180px;background:#fff;border:1px solid #ddd;box-shadow:0 3px 12px rgba(15,23,42,.13)}
.rw-filter-picker.operator .rw-filter-dropdown{width:180px}
.rw-filter-dropdown label{height:38px;background:#fffde8;border-bottom:1px solid #e7e1bd;display:flex;align-items:center;gap:8px;padding:0 10px;color:#777}
.rw-filter-dropdown input{width:100%;border:0;outline:0;background:transparent;font-size:13px}
.rw-filter-dropdown section{border-bottom:1px solid #e5e5e5;padding:6px 0}
.rw-filter-dropdown section:last-child{border-bottom:0}
.rw-filter-dropdown strong{display:flex;align-items:center;gap:5px;color:#999;font-size:14px;padding:5px 12px}
.rw-filter-dropdown button{width:100%;height:34px!important;min-height:34px!important;border:0!important;border-radius:0!important;background:#fff!important;color:#6b6b6b!important;justify-content:flex-start!important;padding:0 20px!important;font-size:14px!important;font-weight:500!important}
.rw-filter-dropdown button:hover,.rw-filter-dropdown button.active{background:#e6f4f4!important;color:#111!important}
.rw-filter-actions{display:flex;align-items:center;gap:22px;margin-left:58px}
.rw-filter-actions button{height:28px!important;min-height:28px!important;border:0!important;background:transparent!important;color:#111!important;padding:0!important;font-size:13px!important}
.rw-filter-popover footer{height:52px;border-top:1px solid #e5e5e5;background:#f6f6f6;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 20px}
.rw-filter-popover footer button{height:30px!important;min-height:30px!important;border-radius:2px!important;padding:0 13px!important;font-size:13px!important}
.rw-filter-popover footer .primary{background:#128696!important;border-color:#128696!important;color:#fff!important}
.rw-tool-glyph{width:15px;height:15px;display:inline-grid;place-items:center;font-size:11px;line-height:1;color:currentColor}
.rw-table-scroll{min-height:0;overflow:auto;position:relative}
.records{border-collapse:collapse;min-width:100%;width:max-content}
.records th,.records td{border-right:1px solid #e1e1e1;border-bottom:1px solid #e1e1e1;min-width:200px;height:56px;padding:0 10px;text-align:left;white-space:nowrap;background:#fff;font-size:13px;color:#111}
.records.row-height-short td{height:36px}
.records.row-height-medium td{height:48px}
.records.row-height-tall td{height:64px}
.records.row-height-extra-tall td{height:78px}
.records th:nth-child(2),.records td:nth-child(2){min-width:300px}
.records th{height:32px;color:#8a8a8a;font-size:11px;font-weight:900;position:sticky;top:0;z-index:2;background:#fbfbfb;cursor:grab;user-select:none;text-transform:uppercase}
.records th:active{cursor:grabbing}
.records th.dragging{opacity:.55}
.records th.drop-target{background:#f0fdf4!important;box-shadow:inset 3px 0 0 #1eb200}
.records th .field-type-icon{display:inline-flex;align-items:center;margin-right:6px;color:#999;vertical-align:middle}
.records th .field-type-icon svg{width:13px;height:13px}
.records th>span:not(.field-type-icon){vertical-align:middle}
.records th button{position:absolute;right:7px;top:5px;width:22px;height:22px;min-height:22px;border:0;background:transparent;color:#888;padding:0}
.record-column-resizer{position:absolute;right:-3px;top:0;width:7px;height:100%;cursor:col-resize;z-index:4}
.record-column-resizer:hover{background:#b7b7b7}
.rw-resizing-column,.rw-resizing-column *{cursor:col-resize!important;user-select:none!important}
.records th.record-select{cursor:default}
.records .record-select{min-width:72px!important;width:72px!important;text-align:center;padding:0}
.records .record-select .record-select-controls{display:flex;align-items:center;justify-content:center;gap:6px;height:100%}
.records .record-select input{width:17px;height:17px;appearance:none;border:1px solid #cfcfcf;border-radius:1px;background:#f8f8f8;vertical-align:middle;display:inline-grid;place-items:center;cursor:pointer}
.records .record-select input:checked{background:#128696;border-color:#128696}
.records .record-select input:checked:after{content:"";width:8px;height:4px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg);display:block;margin:4px 0 0 3px}
.records .record-select button{position:static;width:24px;height:24px;min-height:24px;border:0;border-radius:3px;background:transparent;color:#9f1239;padding:0;display:inline-grid;place-items:center;transition:opacity .15s ease,background .15s ease,color .15s ease}
.records .record-select button:hover,.records .record-select button:focus-visible{background:#fee2e2;color:#be123c;outline:0}
.records .record-select button:disabled{color:#cfcfcf;cursor:default}
.records .record-select .record-row-delete{opacity:0;pointer-events:none}
.records tbody tr:hover .record-row-delete,.records tbody tr.record-selected .record-row-delete,.records .record-select .record-row-delete:focus-visible{opacity:1;pointer-events:auto}
.records .record-select .record-bulk-delete{opacity:0;pointer-events:none}
.records .record-select .record-bulk-delete.active{opacity:1;pointer-events:auto}
.records .record-add-field{min-width:100px!important;width:100px!important;text-align:center;cursor:default}
.records th.record-add-field,.records td:last-child{min-width:100px!important;width:100px!important}
.records .record-add-field button{position:static;width:28px;height:28px;min-height:28px;border:0;background:transparent;color:#8a8a8a;padding:0}
.records td .danger{border:0;background:transparent;padding:0;width:28px;height:28px}
.records .record-add-row td{height:34px}
.records .record-add-row td:first-child{min-width:72px!important;width:72px!important;text-align:center;padding:0}
.records .record-add-row td:nth-child(2){min-width:300px}
.records .record-add-row.editing td{height:38px}
.records .record-add-row button{width:28px;height:28px;min-height:28px;border:0;background:transparent;color:#111;padding:0}
.record-inline-input{height:34px;display:grid;grid-template-columns:22px minmax(0,1fr);align-items:center;margin:0 -10px;border:1px solid #0c8fa0;background:#fff;color:#111}
.record-inline-input span{display:grid;place-items:center;color:#111}
.record-inline-input span svg{width:14px;height:14px}
.record-inline-input input{width:100%;height:32px;border:0;outline:0;background:transparent;color:#111;font-size:13px;padding:0 8px}
.record-inline-input input::placeholder{color:#777}
.record-option-cell{width:calc(100% + 20px);height:34px;margin:0 -10px;border:0;background:#fff;color:#111;font-size:13px;padding:0 28px 0 10px;outline:0}
.record-option-cell:focus{border:1px solid #0c8fa0}
.record-user-cell{display:inline-flex;align-items:center;gap:7px}
.record-user-cell i{width:16px;height:16px;border-radius:999px;background:#9290ee;color:#fff;display:grid;place-items:center;font-size:10px;font-style:normal;font-weight:900}
.record-users-cell{display:inline-flex;align-items:center;gap:4px;min-height:22px}
.record-user-avatar{width:22px;height:22px;border-radius:999px;background:#9290ee;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:900;line-height:1;text-transform:uppercase;box-shadow:0 0 0 2px #fff;cursor:default}
.record-user-avatar+.record-user-avatar{margin-left:-6px}
.record-user-avatar:hover{z-index:1;background:#128696}
.record-file-thumbs{display:flex;align-items:center;gap:6px;min-height:46px}
.record-file-thumbs a{width:42px;height:42px;border:1px solid #d7d7d7;border-radius:3px;overflow:hidden;background:#f5f5f5;display:block}
.record-file-thumbs a>span{width:100%;height:100%;display:block;background-size:cover;background-position:center}
.record-file-thumbs span{color:#777;font-size:12px}
.record-location-link{color:#111;text-decoration:none;display:inline-flex;align-items:center;gap:5px}
.record-location-link:hover{color:#128696;text-decoration:underline}
.record-time-cell{position:relative;min-height:34px;margin:0 -10px}
.record-time-cell>button{width:100%;height:34px!important;min-height:34px!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;display:flex!important;justify-content:flex-start!important;padding:0 10px!important;font-size:13px!important}
.record-time-cell>button.active{border:1px solid #0c8fa0!important}
.record-time-popover{position:absolute;left:0;top:36px;z-index:20;width:320px;background:#fff;border:1px solid #e2e2e2;box-shadow:0 4px 16px rgba(15,23,42,.18)}
.record-time-field{display:grid;gap:8px;padding:18px 20px}
.record-time-field>span{font-size:13px;font-weight:500;color:#111}
.record-time-field>div{height:34px;border:1px solid #cfd3d8;border-radius:3px;display:flex;align-items:center;gap:8px;padding:0 10px;color:#8a8a8a}
.record-time-field input{width:100%;height:32px;border:0;outline:0;background:transparent;color:#111;font-size:15px}
.record-time-picker{position:absolute;left:-100px;top:72px;width:300px;max-height:310px;background:#fff;border:1px solid #e5e5e5;box-shadow:0 2px 10px rgba(15,23,42,.15);overflow:hidden}
.record-time-picker header{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #e5e5e5}
.record-time-picker header strong{font-size:15px;font-weight:500;color:#111}
.record-time-picker header button{width:28px!important;height:28px!important;min-height:28px!important;border:0!important;background:transparent!important;color:#999!important;padding:0!important}
.record-time-picker>div{max-height:268px;overflow:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:8px 10px}
.record-time-picker>div button{height:28px!important;min-height:28px!important;border:1px solid #e3e3e3!important;border-radius:2px!important;background:#fff!important;color:#111!important;padding:0!important;font-size:14px!important}
.record-time-picker>div button.active{background:#128696!important;border-color:#128696!important;color:#fff!important;font-weight:800!important}
.record-time-popover footer{height:43px;border-top:1px solid #e5e5e5;background:#f7f7f7;display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:0 20px;margin-top:8px}
.record-time-popover footer button{height:30px!important;min-height:30px!important;border:0!important;border-radius:3px!important;font-weight:800!important}
.record-time-popover footer .primary{background:#128696!important;border-color:#128696!important;color:#fff!important}
.rw-bottom-status{height:92px;border-top:1px solid #e5e5e5;background:#fafafa;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
.rw-metric{border-right:1px solid #e5e5e5;padding:14px 18px;display:grid;grid-template-columns:34px 1fr;align-items:center;column-gap:10px}
.rw-metric span{width:30px;height:30px;border-radius:999px;background:#e9f7f8;color:#0f838a;display:grid;place-items:center;grid-row:1 / span 2}
.rw-metric strong{display:block;font-size:18px;line-height:1}
.rw-metric p{margin:3px 0 0;color:#777;font-size:12px;font-weight:800}
.rw-card{margin:22px 20px;border:1px solid #e5e5e5;background:#fff;overflow:hidden}
.rw-card header{min-height:60px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px}
.rw-card h2{margin:0;font-size:18px}
.rw-card table{width:100%;border-collapse:collapse}
.rw-card th,.rw-card td{height:58px;border-bottom:1px solid #e5e5e5;text-align:left;padding:0 18px;font-size:13px}
.rw-card th{height:42px;color:#777;font-size:12px;background:#fafafa}
.link-button{border:0!important;background:transparent!important;display:grid!important;justify-content:start!important;text-align:left!important;padding:0!important}
.link-button small{display:block;color:#777;font-weight:400;margin-top:4px}
.selected{background:#f3fbfb}
.rw-grid-cards{padding:22px 20px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.rw-mini-card{min-height:150px;border:1px solid #e5e5e5;background:#fff;padding:18px}
.rw-mini-card h3{margin:12px 0 6px;font-size:16px}
.rw-mini-card p{margin:0;color:#555;line-height:1.45}
.rw-mini-card small{display:block;margin-top:10px;color:#777;font-size:12px}
.rw-mini-card footer{display:flex;gap:8px;margin-top:14px}
.rw-create-tile{min-height:150px;border-style:dashed!important;display:grid!important;place-items:center!important}
.rw-line{min-height:70px;border-bottom:1px solid #e5e5e5;display:grid;grid-template-columns:34px minmax(0,1fr) auto auto auto;align-items:center;gap:12px;padding:12px 18px}
.rw-line:last-child{border-bottom:0}
.rw-line>svg{color:#0f838a}
.rw-line strong{display:block}
.rw-line p{margin:4px 0 0;color:#777;font-size:13px}
.rw-source-syncs>header{min-height:72px}
.rw-source-syncs>header>div{display:grid;gap:4px}
.rw-source-syncs>header p{margin:0;color:#667085;font-size:13px}
.rw-source-sync-head,.rw-source-sync-row{display:grid;grid-template-columns:minmax(210px,1.2fr) minmax(170px,1fr) 140px 150px 100px 160px;align-items:center;gap:14px;padding:0 18px}
.rw-source-sync-head{min-height:40px;background:#f8fafc;border-bottom:1px solid #e5e5e5;color:#667085;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
.rw-source-sync-row{min-height:74px;border-bottom:1px solid #e5e5e5;color:#111;font-size:13px}
.rw-source-sync-row:last-of-type{border-bottom:0}
.rw-source-sync-row strong{display:block;color:#111;font-size:14px}
.rw-source-sync-row p{margin:4px 0 0;color:#667085;font-size:12px}
.rw-source-sync-row em{justify-self:start;border-radius:999px;padding:4px 9px;font-style:normal;font-size:12px;font-weight:800}
.rw-source-sync-row em.sync-ready{background:#e0f2fe;color:#075985}
.rw-source-sync-row em.sync-synced{background:#dcfce7;color:#166534}
.rw-source-sync-row em.sync-no_records{background:#f1f5f9;color:#64748b}
.rw-source-sync-row button{height:34px!important;min-height:34px!important;border:1px solid #dbe3ef!important;border-radius:6px!important;background:#fff!important;color:#111!important;padding:0 11px!important;font-size:12px!important;font-weight:800!important;gap:7px!important}
.rw-source-sync-row button:not(:disabled):hover{background:#f8fafc!important;border-color:#94a3b8!important}
.rw-source-sync-row button:disabled{opacity:.55;cursor:not-allowed}
.rw-source-sync-empty{margin:18px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;display:grid;justify-items:center;text-align:center;gap:6px;padding:26px;color:#64748b}
.rw-source-sync-empty strong{color:#0f172a;font-size:14px}
.rw-source-sync-empty span{max-width:540px;font-size:13px;line-height:1.5}
.rw-security-note{border:1px solid #bfdbfe;background:#eff6ff;color:#1e3a8a;border-radius:8px;padding:12px;display:flex;gap:10px;align-items:flex-start;font-size:13px;font-weight:800;margin:12px 18px}
.rw-security-note svg{flex:0 0 auto;color:#2563eb}
.rw-quality{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:18px;align-items:center;padding:14px 18px;border-bottom:1px solid #e5e5e5}
.rw-quality p{margin:4px 0 0;color:#777}
.progress{height:10px;border-radius:999px;background:#e5e7eb;overflow:hidden}
.progress i{height:100%;display:block;background:#0f838a}
.settings-card{padding-bottom:14px}
.toggle{min-height:74px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;padding:14px 18px}
.toggle strong,.toggle small{display:block}
.toggle small{margin-top:4px;color:#777}
.toggle input{width:18px;height:18px}
.rw-empty{min-height:220px;display:grid;place-items:center;align-content:center;gap:8px;text-align:center;color:#777;padding:24px}
.rw-empty strong{color:#111}
.rw-empty p{max-width:360px;margin:0;font-size:13px;line-height:1.45}
.rw-modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.42);display:grid;place-items:center;padding:48px}
.rw-modal{width:min(780px,calc(100vw - 80px));max-height:calc(100vh - 96px);overflow:auto;background:#fff;box-shadow:0 14px 48px rgba(0,0,0,.24)}
.rw-modal.wide{width:min(900px,calc(100vw - 80px))}
.rw-modal-record{width:min(880px,calc(100vw - 56px));border-radius:14px}
.rw-modal-record>header{position:sticky;top:0;z-index:3;background:#fff;height:58px;padding:0 24px;border-bottom:1px solid #ececf0}
.rw-modal-record>header h2{font-size:15px;font-weight:800;letter-spacing:.04em}
.rw-modal>header{height:52px;border-bottom:1px solid #ddd;display:flex;align-items:center;justify-content:space-between;padding:0 20px}
.rw-modal h2{margin:0;font-size:18px}
.rw-modal>header button{width:32px;height:32px;border:0;background:transparent;padding:0}
.rw-modal-dataset{width:496px;max-height:calc(100vh - 80px);border-radius:3px;box-shadow:0 20px 60px rgba(0,0,0,.24)}
.rw-modal-dataset>header{height:51px;padding:0 19px;border-bottom:1px solid #e5e5e5}
.rw-modal-dataset h2{font-size:16px;font-weight:900;color:#000;text-transform:uppercase}
.rw-modal-dataset>header button{color:#8b949e}
.rw-modal-template{width:min(620px,calc(100vw - 80px));border-radius:6px}
.rw-template-chooser{display:grid;gap:14px;padding:20px}
.rw-template-intro{margin:0;color:#475569;font-size:13px;line-height:1.5}
.rw-template-card{width:100%;min-height:108px!important;border:1px solid #dbe3ef!important;border-radius:10px!important;background:#fff!important;color:#0f172a!important;display:grid!important;grid-template-columns:46px minmax(0,1fr)!important;align-items:center!important;gap:14px!important;padding:16px!important;text-align:left!important}
.rw-template-card:hover{border-color:#0f838a!important;background:#f8fffe!important}
.rw-template-card>span:nth-child(2){min-width:0}
.rw-template-card strong{display:block;font-size:15px;font-weight:850;color:#0f172a;margin-bottom:5px}
.rw-template-card small{display:block;color:#64748b;font-size:12px;line-height:1.45;font-weight:500;overflow-wrap:anywhere}
.rw-template-card em{grid-column:2;font-style:normal;color:#0f838a;font-size:12px;font-weight:900;white-space:normal;justify-self:start}
@media (min-width:700px){.rw-template-card{grid-template-columns:46px minmax(0,1fr) auto!important}.rw-template-card em{grid-column:auto;white-space:nowrap;justify-self:end}}
.rw-template-icon{width:46px;height:46px;border-radius:10px;background:#ecfdf5;color:#0f838a;display:grid;place-items:center}
.rw-modal-fieldPicker{width:min(1160px,calc(100vw - 48px));height:min(802px,calc(100vh - 48px));border-radius:3px;box-shadow:0 20px 60px rgba(0,0,0,.24);overflow:hidden}
.rw-modal-fieldPicker>header{height:51px;border-bottom:1px solid #dedede;padding:0 20px}
.rw-modal-fieldPicker h2{font-size:18px;font-weight:900;color:#111;text-transform:none}
.rw-manage-fields-dialog{height:calc(min(802px,100vh - 48px) - 51px);display:grid;grid-template-columns:249px minmax(0,1fr);background:#f7f7f7}
.rw-manage-fields-dialog aside{border-right:1px solid #dedede;background:#f7f7f7;padding:17px 10px}
.rw-manage-fields-dialog aside h3{margin:0 10px 10px;font-size:14px;color:#000}
.rw-manage-fields-dialog aside h3:nth-of-type(2){margin-top:30px}
.rw-manage-fields-dialog aside button{width:100%;height:32px!important;min-height:32px!important;border:0!important;border-radius:2px!important;background:transparent!important;color:#5f6871!important;justify-content:flex-start!important;font-size:14px!important;padding:0 10px!important}
.rw-manage-fields-dialog aside button.active{background:#e8e8e8!important;color:#111!important;font-weight:800!important}
.rw-manage-fields-dialog aside button.template-action{background:#ecfdf5!important;color:#0f838a!important;font-weight:850!important}
.rw-manage-fields-dialog aside button.undo-template-action{background:#fff7ed!important;color:#9a3412!important;font-weight:850!important}
.rw-manage-fields-dialog main{padding:0 20px 28px;overflow:auto}
.rw-manage-fields-dialog main>h2{height:55px;display:flex;align-items:center;margin:0;font-size:20px;font-weight:900}
.rw-manage-fields-dialog main>section{background:#fff;border:1px solid #e0e0e0;padding:20px;margin-top:20px}
.rw-manage-fields-dialog main>section>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}
.rw-manage-fields-dialog main>section h3{margin:0;font-size:22px}
.rw-manage-fields-dialog main>section header div{display:flex;gap:12px}
.rw-manage-fields-dialog main>section header button{height:32px!important;min-height:32px!important;border:1px solid #cfd8df!important;border-radius:2px!important;background:#fff!important;color:#128696!important;font-weight:800!important}
.rw-manage-fields-dialog main>section header button.template{border-color:#b7e7ca!important;background:#ecfdf5!important;color:#0f838a!important;gap:6px!important}
.rw-manage-fields-dialog main>section header button.undo-template{border-color:#fed7aa!important;background:#fff7ed!important;color:#9a3412!important;gap:6px!important}
.rw-settings-panel{display:grid;gap:14px}
.rw-settings-panel.compact{margin-top:22px}
.rw-settings-panel h3{font-size:18px!important}
.rw-settings-panel p{margin:0;color:#6b7280;font-size:13px}
.rw-settings-panel label{display:grid;gap:7px;color:#111;font-size:13px;font-weight:700}
.rw-settings-panel input,.rw-settings-panel select,.rw-settings-panel textarea,.rw-people-editor input{width:100%;border:1px solid #cfcfcf;background:#fff;color:#111;min-height:34px;padding:0 10px;outline:0}
.rw-settings-panel textarea{min-height:100px;padding:10px;resize:vertical}
.rw-settings-panel .toggle{display:flex}
.rw-settings-panel .rw-check-row{display:flex;grid-template-columns:none;align-items:center;gap:10px;font-weight:500}
.rw-settings-panel .rw-check-row input{width:18px;height:18px;min-height:18px;padding:0;accent-color:#158996}
.rw-settings-panel fieldset{border:0;border-top:1px solid #e4e4e4;margin:8px 0 0;padding:18px 0 0;display:flex;gap:28px;flex-wrap:wrap}
.rw-settings-panel legend{font-weight:800;margin-bottom:8px}
.rw-settings-panel fieldset label{display:flex;align-items:center;gap:10px;font-weight:500}
.rw-settings-panel fieldset input{width:19px;height:19px;min-height:19px;padding:0;accent-color:#268bd2}
.rw-settings-panel footer{border-top:1px solid #e5e5e5;margin-top:10px;padding-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.rw-settings-panel footer small{color:#8a8f98}
.rw-settings-panel footer button{min-width:96px!important;border-radius:3px!important}
.rw-settings-panel em{font-style:normal;border:1px solid #e3c6f4;background:#faf5ff;color:#a21caf;border-radius:3px;font-size:11px;padding:2px 5px}
.rw-people-editor{display:grid;gap:8px}
.rw-people-editor>span{font-size:13px;font-weight:800}
.rw-people-editor>div{min-height:34px;border:1px solid #cfcfcf;background:#fff;display:flex;align-items:center;gap:6px;padding:4px 8px;flex-wrap:wrap}
.rw-people-editor button{height:24px!important;min-height:24px!important;border:1px solid #d7d7d7!important;border-radius:2px!important;background:#f5f5f5!important;color:#111!important;padding:0 6px!important}
.rw-people-editor b{width:18px;height:18px;border-radius:999px;background:#9290ee;color:#fff;display:grid;place-items:center;font-size:11px}
.rw-view-settings-list{border-top:1px solid #e5e5e5}
.rw-view-settings-list article{min-height:49px;border-bottom:1px solid #e5e5e5;display:grid;grid-template-columns:36px 22px minmax(0,1fr) auto auto auto;align-items:center;gap:10px}
.switch input{display:none}
.switch span{width:31px;height:17px;border-radius:999px;background:#999;display:block;position:relative}
.switch span:after{content:"";position:absolute;width:13px;height:13px;border-radius:999px;background:#fff;left:2px;top:2px}
.switch input:checked+span{background:#268bd2}
.switch input:checked+span:after{left:16px}
.rw-inline-view-form{display:flex;gap:10px;margin-top:18px}
.rw-inline-view-form input{width:220px;border:1px solid #d7d7d7;padding:0 10px}
.rw-settings-panel .notice{background:#e9fae9;border:1px solid #abe7b0;color:#118000;padding:12px 20px}
.rw-export-fields,.rw-import-columns{border:1px solid #ddd;background:#fff}
.rw-export-fields label{height:36px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:12px;padding:0 12px;font-weight:500}
.rw-export-fields label:last-child,.rw-import-columns article:last-child{border-bottom:0}
.rw-export-fields input{width:18px;height:18px;min-height:18px;padding:0;accent-color:#158996}
.rw-import-columns article{min-height:39px;border-bottom:1px solid #eee;display:grid;grid-template-columns:58px minmax(0,1fr) minmax(120px,auto);align-items:center;gap:12px;padding:0 12px}
.rw-import-columns span{color:#00a86b;font-weight:800}
.rw-import-columns code{color:#8a8a8a;font-size:12px}
.rw-active-field-list{border:1px solid #ddd;background:#fff}
.rw-active-field-list article{min-height:72px;border-bottom:1px solid #e5e5e5;display:grid;grid-template-columns:16px 22px minmax(0,1fr) auto auto 34px;align-items:center;gap:10px;padding:10px 12px 10px 10px;position:relative}
.rw-active-field-list article:last-child{border-bottom:0}
.rw-active-field-list .drag{color:#aaa;font-weight:900;letter-spacing:-2px}
.rw-active-field-list .icon{color:#111}
.rw-active-field-list strong{display:block;font-size:15px;color:#111}
.rw-active-field-list small{display:block;margin-top:5px;color:#666;font-size:12px}
.rw-active-field-list p{margin:7px 0 0;color:#888;font-size:13px}
.rw-active-field-list em{border:1px solid #d6dddf;border-radius:999px;background:#f6fafa;color:#5d6a70;font-style:normal;font-size:11px;padding:3px 6px}
.rw-field-row-actions{position:relative;display:grid;place-items:center}
.rw-field-row-actions>button{width:28px!important;height:28px!important;min-height:28px!important;border:0!important;background:transparent!important;color:#777!important;padding:0!important}
.rw-field-row-actions>button:hover{background:#f2f2f2!important;color:#111!important}
.rw-field-row-actions>div{position:absolute;right:0;top:32px;z-index:10;width:150px;background:#fff;border:1px solid #ddd;box-shadow:0 8px 18px rgba(15,23,42,.16);padding:5px 0}
.rw-field-row-actions>div button{width:100%;height:34px!important;min-height:34px!important;border:0!important;border-radius:0!important;background:#fff!important;color:#dc2626!important;justify-content:flex-start!important;padding:0 12px!important;font-weight:700!important}
.rw-field-row-actions>div button:hover{background:#fff1f2!important}
.rw-field-row-actions>div button:disabled{color:#aaa!important;cursor:not-allowed}
.rw-confirm-backdrop{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.48);display:grid;place-items:center;padding:24px}
.rw-confirm-dialog{position:relative;width:min(420px,calc(100vw - 48px));background:#fff;border-radius:6px;box-shadow:0 24px 70px rgba(0,0,0,.32);padding:28px 30px 24px;text-align:center;color:#111;display:grid;gap:13px}
.rw-confirm-dialog>button{position:absolute;right:12px;top:12px;width:30px!important;height:30px!important;min-height:30px!important;border:0!important;background:transparent!important;color:#777!important;padding:0!important}
.rw-confirm-icon{width:54px;height:54px;border-radius:999px;background:#fff1f2;color:#dc2626;border:1px solid #fecdd3;display:grid;place-items:center;margin:2px auto 0}
.rw-confirm-dialog h3{margin:0;font-size:22px;font-weight:900;color:#111}
.rw-confirm-dialog p{margin:0;color:#5f6671;font-size:14px;line-height:1.5}
.rw-confirm-dialog p strong{color:#111}
.rw-confirm-dialog footer{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}
.rw-confirm-dialog footer button{height:38px!important;min-height:38px!important;border-radius:4px!important;font-size:14px!important;font-weight:850!important}
.rw-confirm-dialog footer button:first-child{background:#f4f4f5!important;border-color:#e4e4e7!important;color:#3f3f46!important}
.rw-confirm-dialog footer .danger{background:#dc2626!important;border-color:#dc2626!important;color:#fff!important}
.rw-confirm-dialog footer .danger:hover{background:#b91c1c!important;border-color:#b91c1c!important}
.rw-add-fields-head{height:42px;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:16px;padding:0 16px}
.rw-add-fields-head button{height:30px!important;min-height:30px!important;border:0!important;background:transparent!important;color:#128696!important;font-weight:800!important;padding:0!important}
.rw-modal-field{width:min(940px,calc(100vw - 80px));border-radius:3px;box-shadow:0 20px 60px rgba(0,0,0,.24)}
.rw-modal-field>header{height:52px;border-bottom:1px solid #dedede;padding:0 20px}
.rw-modal-field h2{font-size:16px;font-weight:900;color:#000;text-transform:uppercase}
.rw-standard-field-form{display:grid;grid-template-columns:1.2fr .95fr;min-height:578px}
.rw-standard-field-main{display:grid;align-content:start;gap:16px;padding:20px;border-right:1px solid #dedede}
.rw-standard-line,.rw-picker-field{display:grid;gap:8px;position:relative;color:#111;font-size:12px;font-weight:700}
.rw-standard-line input{height:42px;border:1px solid #c9c9c9;background:#fff;color:#111;padding:0 12px;font-size:21px;outline:0}
.rw-standard-description{height:22px;display:flex;align-items:center;gap:8px;color:#8a8a8a}
.rw-standard-description input{width:100%;border:0;outline:0;background:transparent;font-size:14px;color:#111}
.rw-field-scope{display:flex;align-items:center;gap:18px;flex-wrap:wrap;color:#777;font-size:14px}
.rw-field-scope>span{width:100%;color:#111;font-size:12px;font-weight:800}
.rw-field-scope small{width:16px;height:16px;border-radius:999px;border:1px solid #aaa;display:inline-grid;place-items:center;font-size:11px;color:#777}
.rw-field-scope input,.rw-link-multiple input,.rw-settings-box input{width:18px;height:18px;accent-color:#158996}
.rw-field-scope label,.rw-link-multiple,.rw-settings-box label{display:flex;align-items:center;gap:10px}
.rw-picker-field>button{height:34px!important;min-height:34px!important;border:1px solid #c9c9c9!important;border-radius:0!important;background:#fff!important;color:#111!important;justify-content:flex-start!important;font-size:14px!important;font-weight:500!important;padding:0 10px!important}
.rw-picker-field>button svg:last-child{margin-left:auto;color:#8a8a8a}
.rw-picker-field>small{color:#777;font-size:12px;font-weight:500}
.rw-dropdown-panel{position:absolute;left:0;right:0;top:62px;z-index:30;background:#fff;border:1px solid #d9d9d9;box-shadow:0 2px 8px rgba(15,23,42,.16)}
.rw-dropdown-panel>label{height:36px;display:grid;grid-template-columns:minmax(0,1fr) 30px;align-items:center;background:#fffde9;border-bottom:1px solid #ece8bd;color:#777}
.rw-dropdown-panel>label input{height:34px;border:0;outline:0;background:transparent;padding:0 12px;font-size:14px}
.rw-dropdown-panel>div{max-height:236px;overflow:auto;padding:8px 14px 8px 10px;display:grid;gap:4px}
.rw-dropdown-panel button{min-height:56px!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;grid-template-rows:auto auto!important;gap:2px 8px!important;justify-items:start!important;text-align:left!important;padding:8px 10px!important}
.rw-dropdown-panel button span{grid-row:1 / span 2;color:#111}
.rw-dropdown-panel button strong{font-size:15px;font-weight:800;line-height:1.1}
.rw-dropdown-panel button small{color:#777;font-size:13px;line-height:1.2}
.rw-dropdown-panel button.active{background:#158996!important;color:#fff!important}
.rw-dropdown-panel button.active small,.rw-dropdown-panel button.active span{color:#fff!important}
.rw-dropdown-panel.dataset button{min-height:54px!important}
.rw-dropdown-panel.aggregate button{min-height:35px!important;display:flex!important;grid-template-columns:none!important;padding:0 10px!important}
.rw-dropdown-panel.aggregate button strong{font-size:14px;font-weight:500}
.rw-dropdown-empty{margin:8px 10px;color:#777;font-size:13px}
.rw-link-multiple{font-size:14px;color:#111}
.rw-rollup-condition{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;color:#111;font-weight:600}
.rw-rollup-condition input{width:32px;height:18px;appearance:none;border:0;border-radius:999px;background:#cfd2d3;position:relative}
.rw-rollup-condition input:before{content:"";position:absolute;width:14px;height:14px;border-radius:999px;background:#fff;left:2px;top:2px}
.rw-rollup-condition input:checked{background:#158996}
.rw-rollup-condition input:checked:before{left:16px}
.rw-standard-settings{display:grid;align-content:start;gap:14px;padding:28px 20px;background:#fafafa}
.rw-standard-settings h3{margin:0;font-size:16px;color:#000}
.rw-settings-box{display:grid;gap:14px;border:1px solid #ddd;border-radius:3px;background:#fff;padding:16px}
.rw-settings-box label{font-size:14px;color:#111}
.rw-settings-box b{color:#d60b0b}
.rw-rule-row,.rw-display-row{height:50px!important;min-height:50px!important;border:1px solid #ddd!important;border-radius:2px!important;background:#fff!important;box-shadow:0 1px 3px rgba(15,23,42,.08);justify-content:flex-start!important;color:#111!important;font-size:14px!important}
.rw-rule-row span{width:32px;height:19px;border-radius:999px;background:#cfd2d3;position:relative;flex:0 0 auto}
.rw-rule-row span:before{content:"";position:absolute;width:15px;height:15px;border-radius:999px;background:#fff;left:2px;top:2px}
.rw-rule-row svg,.rw-display-row svg{margin-left:auto;color:#999}
.rw-standard-field-form>footer{grid-column:1/-1;height:88px;border-top:1px solid #dedede;background:#fff;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;padding:0 20px}
.rw-standard-field-form>footer button{height:38px!important;min-height:38px!important;border:0!important;border-radius:3px!important;font-weight:800!important;font-size:14px!important}
.rw-standard-field-form>footer button:first-child{background:#f4f4f4!important;color:#777!important}
.rw-standard-field-form>footer .primary{background:#20b80d!important;border-color:#20b80d!important;color:#fff!important}
.rw-modal-record{width:min(1040px,calc(100vw - 64px));max-height:calc(100vh - 56px);border-radius:16px;overflow:hidden;box-shadow:0 28px 80px rgba(15,23,42,.28)}
.rw-modal-record>header{height:64px;border-bottom:1px solid #e5eaf0;padding:0 24px;background:#fff}
.rw-modal-record h2{font-size:18px;font-weight:850;color:#0f172a;text-transform:none;letter-spacing:0}
.rw-modal-record>header button{border-radius:999px;color:#64748b}
.rw-record-form{display:grid;grid-template-columns:minmax(0,1fr) 300px;min-height:560px;max-height:calc(100vh - 120px);background:#f8fafc}
.rw-record-main{display:grid;align-content:start;gap:18px;padding:24px 28px 30px;background:#fff;border-right:1px solid #e5eaf0;overflow:auto}
.rw-record-main::-webkit-scrollbar{width:10px}
.rw-record-main::-webkit-scrollbar-thumb{background:#d8dee8;border:3px solid #fff;border-radius:999px}
.rw-record-heading{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:12px;padding-bottom:2px}
.rw-record-heading>span{width:42px;height:42px;border-radius:11px;background:#ecfdf5;color:#0f838a;display:grid;place-items:center}
.rw-record-heading strong{display:block;color:#0f172a;font-size:17px;font-weight:850}
.rw-record-heading small{display:block;margin-top:3px;color:#64748b;font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-record-heading em{font-style:normal;border:1px solid #dbe3ef;border-radius:999px;background:#f8fafc;color:#475569;padding:6px 10px;font-size:12px;font-weight:800;white-space:nowrap}
.rw-record-primary-card{border:1px solid #dbe6ef;border-radius:12px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%);padding:16px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.rw-record-fields-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 16px}
.rw-record-fields-grid:empty{display:none}
.rw-record-fields-grid .rw-form-line.wide,.rw-record-fields-grid .rw-file-field,.rw-record-fields-grid .rw-location-field,.rw-record-fields-grid .rw-multi-options{grid-column:1/-1}
.rw-record-settings{display:grid;align-content:start;gap:16px;padding:24px;background:#f8fafc}
.rw-record-dataset-card,.rw-record-settings-card{border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.rw-record-dataset-card{display:grid;grid-template-columns:36px minmax(0,1fr);gap:10px;align-items:center;padding:14px}
.rw-record-dataset-card>span{width:36px;height:36px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center}
.rw-record-dataset-card strong{display:block;color:#0f172a;font-size:13px;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-record-dataset-card small{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:600}
.rw-record-settings-card{display:grid;gap:15px;padding:16px}
.rw-record-settings h3{margin:0;font-size:12px;font-weight:850;color:#0f172a;letter-spacing:.06em;text-transform:uppercase}
.rw-record-form .rw-form-line{display:grid;gap:8px;font-size:12.5px;color:#334155;font-weight:750;min-width:0}
.rw-record-form .rw-form-line input,.rw-record-form .rw-form-line select,.rw-record-form .rw-form-line textarea{width:100%;box-sizing:border-box;border:1px solid #ccd7e4;border-radius:10px!important;background:#fff;color:#0f172a;font-size:14px;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
.rw-record-form .rw-form-line input,.rw-record-form .rw-form-line select{height:44px;padding:0 13px}
.rw-record-form .rw-form-line textarea{min-height:104px;padding:12px 13px;line-height:1.5;resize:vertical}
.rw-record-form .rw-form-line input::placeholder,.rw-record-form .rw-form-line textarea::placeholder{color:#94a3b8}
.rw-record-form .rw-form-line input:focus,.rw-record-form .rw-form-line select:focus,.rw-record-form .rw-form-line textarea:focus{border-color:#0f838a;box-shadow:0 0 0 3px rgba(15,131,138,.14);outline:0;background:#fff}
.rw-record-primary-card .rw-form-line input{height:54px;font-size:20px;font-weight:700}
.rw-record-primary-card .rw-form-line select{height:54px;font-size:16px;font-weight:700}
.rw-custom-field-divider{height:22px;display:flex;align-items:center;gap:10px;color:#64748b;font-size:12px;font-weight:850;letter-spacing:.03em}
.rw-custom-field-divider small{border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#64748b;padding:2px 8px;font-size:11px;letter-spacing:0}
.rw-custom-field-divider:after{content:"";height:1px;background:#e5eaf0;flex:1}
.rw-link-error{display:block;border:1px solid #f0b1b1;background:#fff0f0;color:#111;padding:15px 18px;line-height:1.35;font-size:14px}
.rw-file-picker{position:relative;min-height:78px;border:1px dashed #b7c5d6;border-radius:12px;background:#f8fafc;color:#334155;display:grid;grid-template-columns:36px minmax(0,1fr);grid-template-rows:auto auto;align-content:center;gap:3px 10px;padding:12px 14px;cursor:pointer}
.rw-file-picker:hover{border-color:#0f838a;background:#f3fbfa}
.rw-file-picker svg{grid-row:1/3;width:36px;height:36px;border-radius:9px;background:#fff;color:#0f838a;padding:8px;box-shadow:0 1px 2px rgba(15,23,42,.06)}
.rw-file-picker strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px;color:#0f172a}
.rw-file-picker small{font-size:12px;color:#64748b}
.rw-file-picker input{position:absolute;inset:0;opacity:0;cursor:pointer;height:auto!important;padding:0!important}
.rw-file-picker.has-file{border-style:solid;background:#f0fdf4;border-color:#b7e7ca}
.rw-multi-options{border:1px solid #e2e8f0;border-radius:12px;background:#fff;margin:0;padding:14px;display:grid;gap:9px}
.rw-multi-options legend{font-size:12.5px;margin:0 0 6px;color:#334155;font-weight:750}
.rw-multi-options label{display:flex;align-items:center;gap:8px;font-size:14px;color:#0f172a}
.rw-progress-field{display:grid;grid-template-columns:minmax(0,1fr) 46px;gap:8px;align-items:center;color:#111;font-size:13px}
.rw-progress-field>span{grid-column:1/-1}
.rw-progress-field input{width:100%}
.rw-progress-field b{text-align:right}
.rw-record-separator{height:28px;border-bottom:1px solid #ddd;color:#777;font-weight:900;text-transform:uppercase;font-size:12px;display:flex;align-items:center}
.rw-location-field{display:grid;gap:10px}
.rw-location-field label{display:grid;gap:8px;color:#111;font-size:13px;font-weight:500}
.rw-location-field label>div{min-height:42px;border:1px solid #c9c9c9;background:#fff;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;color:#777}
.rw-location-field input{height:40px;border:0!important;outline:0;background:transparent;color:#111;font-size:15px;padding:0 8px}
.rw-location-field button{height:28px!important;min-height:28px!important;border:0!important;border-left:1px solid #e2e2e2!important;border-radius:0!important;background:#f8f8f8!important;color:#128696!important;font-size:12px!important;font-weight:800!important;margin-right:4px}
.rw-location-map{position:relative}
.rw-location-map iframe{width:100%;height:190px;border:1px solid #d9d9d9;background:#f7f7f7}
.rw-location-map a{position:absolute;left:10px;top:10px;z-index:2;height:31px;background:#fff;border-radius:2px;box-shadow:0 1px 4px rgba(0,0,0,.25);display:inline-flex;align-items:center;gap:4px;padding:0 10px;color:#1a73e8;font-size:13px;font-weight:800;text-decoration:none}
.rw-location-field small{color:#667085;font-size:12px}
.rw-people-box{display:grid;gap:8px;color:#0f172a;font-size:13px}
.rw-people-box>span{font-weight:800;color:#334155;font-size:12px}
.rw-people-box>div{min-height:46px;border:1px solid #dbe3ec;border-radius:10px;background:#fff;display:flex;align-items:center;gap:9px;padding:0 12px;font-size:13px;color:#0f172a}
.rw-people-box b{width:24px;height:24px;border-radius:999px;background:#0f838a;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:850}
.rw-people-box svg:last-child{margin-left:auto;color:#94a3b8}
.rw-record-form>footer{grid-column:1/-1;min-height:72px;border-top:1px solid #e5eaf0;background:#fff;display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:14px 24px;position:sticky;bottom:0}
.rw-record-form>footer button{height:42px!important;min-height:42px!important;border:1px solid transparent!important;border-radius:10px!important;font-weight:800!important;font-size:13.5px!important;padding:0 20px!important;cursor:pointer}
.rw-record-form>footer button:first-child{background:#fff!important;border-color:#dbe3ec!important;color:#475569!important}
.rw-record-form>footer button:first-child:hover{background:#f4f6f8!important}
.rw-record-form>footer .primary{background:#0f172a!important;border-color:#0f172a!important;color:#fff!important;min-width:148px;justify-content:center}
.rw-record-form>footer .primary:hover{background:#111827!important}
.rw-dataset-form{display:grid;gap:16px;padding:20px}
.rw-dataset-form-line{display:grid;gap:8px;color:#111827;font-size:12px;font-weight:500}
.rw-dataset-name-input{height:44px;border:1px solid #12a8bd;background:#fff;display:grid;grid-template-columns:minmax(0,1fr) 34px;align-items:center}
.rw-dataset-name-input input{width:100%;height:42px;border:0!important;box-shadow:none!important;outline:0!important;background:transparent;color:#111827;font-size:22px;padding:0 10px}
.rw-dataset-name-input input::placeholder{color:#687487}
.rw-dataset-name-input svg{color:#0a8ea0;justify-self:center}
.rw-dataset-form-line input{height:33px;border:1px solid #cfd3d8;background:#fff;color:#111827;padding:0 9px;outline:0;font-size:14px}
.rw-dataset-form-line input::placeholder{color:#8a9099}
.rw-folder-combobox{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 40px;border:1px solid #111;background:#fff;box-shadow:0 0 0 3px #e5e5e5}
.rw-folder-combobox input{height:31px!important;border:0!important;padding:0 9px!important;font-size:15px!important}
.rw-folder-combobox button{height:31px!important;min-height:31px!important;border:0!important;border-radius:0!important;background:#fff!important;color:#000!important;padding:0!important}
.rw-folder-dropdown{position:absolute;left:0;right:0;top:34px;z-index:25;background:#fff;border:1px solid #111;border-top:0;box-shadow:0 10px 20px rgba(0,0,0,.12)}
.rw-folder-dropdown button{width:100%;height:45px!important;min-height:45px!important;border:0!important;border-bottom:1px solid #9a9a9a!important;border-radius:0!important;background:#fff!important;color:#000!important;justify-content:flex-start!important;padding:0 28px!important;font-size:13px!important;font-weight:500!important;text-transform:uppercase}
.rw-folder-dropdown button:last-child{border-bottom:0!important}
.rw-folder-dropdown button:hover,.rw-folder-dropdown button:focus{background:#000!important;color:#fff!important}
.rw-dataset-description{height:28px;display:flex;align-items:center;gap:8px;color:#8a9099}
.rw-dataset-description input{width:100%;border:0;outline:0;background:transparent;color:#111827;font-size:14px}
.rw-dataset-description input::placeholder{color:#7b8490}
.rw-dataset-form footer{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:2px}
.rw-dataset-form footer button{height:37px;min-height:37px;border:0;border-radius:3px;font-size:14px;font-weight:800}
.rw-dataset-form footer button:first-child{background:#f4f4f4;color:#6b7280}
.rw-dataset-form footer button.primary{background:#20b80d!important;border-color:#20b80d!important;color:#fff!important}
.rw-add-fields{background:#fff}
.add-tabs{height:42px;display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #ddd}
.add-tabs button{height:42px;border:0;border-right:1px solid #ddd;background:#f7f7f7;color:#888;border-radius:0;font-size:13px}
.add-tabs button.active{background:#fff;color:#111;font-weight:500}
.field-card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:20px;max-height:calc(100vh - 192px);overflow:auto}
.field-type{min-height:126px;border:1px solid #d8e4e8;border-radius:4px;display:grid!important;place-items:center;text-align:center;padding:14px!important;gap:7px;font:inherit;cursor:pointer;align-content:center;color:#333}
.field-type strong{font-size:14px;line-height:1.2}
.field-type small{color:#888;line-height:1.25;max-width:160px}
.field-type span{display:grid;place-items:center;color:#0f76bd}
.field-type.blue{background:#e8f2fb}
.field-type.cyan{background:#e9f8fa}
.field-type.green{background:#ecf8ef}
.field-type.indigo{background:#eef1fb}
.field-type.yellow{background:#fbf7e7}
.field-type.orange{background:#fff1e7}
.field-type.red{background:#fff0f0}
.field-type.pink{background:#faedf6}
.field-type.purple{background:#f4e9f8}
.field-type.slate{background:#f1f4f5}
.existing-fields{padding:22px;min-height:360px}
.existing-fields section{border:1px solid #e1e1e1;background:#fff}
.existing-fields h3{height:42px;margin:0;border-bottom:1px solid #e1e1e1;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:14px}
.existing-fields button{width:100%;min-height:44px;border:0;border-bottom:1px solid #eee;border-radius:0;background:#fff;display:grid;grid-template-columns:24px minmax(0,1fr) 160px auto;align-items:center;gap:10px;text-align:left;padding:0 14px}
.existing-fields button strong,.existing-fields button small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.existing-fields button small{color:#777}
.existing-fields em{font-style:normal;border:1px solid #ddd;border-radius:12px;padding:2px 7px;color:#777;font-size:12px}
.existing-fields p{margin:0;padding:18px;color:#777}
.rw-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:20px}
.rw-form p,.rw-form .wide,.rw-form footer{grid-column:1/-1}
.rw-form-line{display:grid;gap:8px;color:#333;font-size:12px;font-weight:800}
.rw-form-line input,.rw-form-line select,.rw-form-line textarea{width:100%;min-height:40px;border:1px solid #ccc;border-radius:0;padding:0 10px;outline:0}
.rw-form-line textarea{min-height:150px;padding:10px;resize:vertical}
.rw-form .check{display:flex;align-items:center;gap:8px;font-weight:800}
.rw-form footer{display:flex;justify-content:flex-end;border-top:1px solid #eee;padding-top:14px}
@media(max-width:900px){
  .rw-topbar{grid-template-columns:1fr}.rw-global-search,.rw-top-actions{display:none}.rw-body{grid-template-columns:1fr}.rw-workspace-panel{display:none}.rw-titlebar{grid-template-columns:32px 1fr}.rw-title-actions{grid-column:1/-1;overflow:auto}.rw-grid-cards{grid-template-columns:1fr}.rw-bottom-status{grid-template-columns:repeat(2,1fr)}.field-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.existing-fields button{grid-template-columns:24px minmax(0,1fr)}.existing-fields button small,.existing-fields em{display:none}.rw-form{grid-template-columns:1fr}.rw-form p,.rw-form .wide,.rw-form footer{grid-column:auto}
}

/* ===== UI polish pass ===== */
.rw-app{--rw-line:#e6e8ec;--rw-radius:12px;--rw-radius-sm:8px}
/* Softer, consistent surfaces + subtle elevation */
.rw-card,.rw-mini-card,.rw-folder-list-card,.rw-security-note{border-radius:var(--rw-radius)!important;border-color:var(--rw-line);box-shadow:0 1px 2px rgba(15,23,42,.05)}
.rw-modal,.rw-modal-dataset,.rw-modal-fieldPicker{border-radius:var(--rw-radius)!important}
.rw-create-tile{border-radius:var(--rw-radius)!important}
/* Rounded inputs, search and form fields */
.rw-global-search,.rw-title-actions label,.rw-management-actions label,.rw-dataset-detail-actions label,.rw-sort-search,.rw-form-line input,.rw-form-line select,.rw-form-line textarea{border-radius:var(--rw-radius-sm)!important}
/* Unify hairline borders across chrome */
.rw-topbar,.rw-titlebar,.rw-management-header,.rw-dataset-detail-header,.rw-viewbar,.rw-grid-actions,.rw-bottom-status,.rw-metric,.rw-line,.toggle,.rw-quality,.rw-card header,.rw-card th,.rw-card td,.rw-folder-list-row,.rw-management-row{border-color:var(--rw-line)}
/* Visible keyboard focus */
.rw-app button:focus-visible,.rw-app input:focus-visible,.rw-app select:focus-visible,.rw-app textarea:focus-visible{outline:2px solid #0f838a;outline-offset:1px}
/* Hover affordance for neutral buttons (sidebar keeps its own !important hover) */
.rw-app button:not(.create):not(.primary):not(.danger):not(.rw-top-primary):not(.active):hover{background:#f6f8fa}
/* Calmer heading weights */
.rw-management-title h1,.rw-dataset-detail-title h1,.rw-titlebar h1,.rw-card h2,.rw-modal h2{font-weight:800}
/* Slightly stronger empty-state copy hierarchy */
.rw-empty strong,.rw-folder-empty strong{font-weight:800}
/* Datasets sidebar — light theme */
.rw-workspace-panel{background:#ffffff!important;color:#0f172a!important;border-color:#e5e7eb!important}
.rw-panel-brand{background:#ffffff!important}
.rw-panel-brand strong{color:#0f172a!important}
.rw-panel-brand small{color:#64748b!important}
.rw-back-dashboard{border-color:#e5e7eb!important;background:#f8fafc!important;color:#0f172a!important}
.rw-back-dashboard svg{color:#334155!important;stroke:#334155!important}
.rw-back-dashboard:hover{background:#f1f5f9!important}
.rw-back-link{border-color:#e5e7eb!important;background:#f8fafc!important;color:#0f172a!important}
.rw-back-link svg{color:#334155!important;stroke:#334155!important}
.rw-back-link:hover{background:#f1f5f9!important}
.rw-panel-label{color:#64748b!important;background:#ffffff!important}
.rw-panel-nav{background:#ffffff!important}
.rw-panel-nav a,.rw-panel-nav button{color:#334155!important}
.rw-panel-nav a svg,.rw-panel-nav button svg{color:#64748b!important;stroke:#64748b!important}
.rw-panel-nav a:hover,.rw-panel-nav button:hover{background:#f1f5f9!important;color:#0f172a!important}
.rw-panel-nav a:hover svg,.rw-panel-nav button:hover svg{color:#334155!important;stroke:#334155!important}
.rw-panel-nav a.active,.rw-panel-nav button.active{background:#eef2f7!important;color:#0f172a!important}
.rw-panel-nav a.active svg,.rw-panel-nav button.active svg{color:#0f172a!important;stroke:#0f172a!important}
.rw-simple-nav .rw-folder-group{background:#ffffff!important;color:#64748b!important;border-top-color:#e5e7eb!important}
.rw-simple-nav .rw-folder-group svg{color:#64748b!important;stroke:#64748b!important}
.rw-simple-nav .rw-sales-link{color:#334155!important;background:#ffffff!important}
.rw-simple-nav .rw-sales-link.active{color:#0f172a!important;background:#eef2f7!important}
.rw-sidebar-folders,.rw-sidebar-folders section{background:#ffffff!important}
.rw-sidebar-folder-head{background:#ffffff!important;color:#475569!important;border-bottom-color:#e5e7eb!important}
.rw-sidebar-folder-head svg{color:#64748b!important;stroke:#64748b!important}
.rw-sidebar-folders section>button:not(.rw-sidebar-folder-head){background:#ffffff!important;color:#334155!important}
.rw-sidebar-folders section>button:not(.rw-sidebar-folder-head):hover{background:#f1f5f9!important;color:#0f172a!important}
.rw-sidebar-folders section>button.active:not(.rw-sidebar-folder-head){background:#eef2f7!important;color:#0f172a!important}

/* ============================================================
   DATASETS MANAGEMENT - polished overview
   ============================================================ */
.rw-mgmt{background:#f8fafc;padding:0 28px 40px;border-top:0}
.rw-mgmt-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:28px 0 18px;border-bottom:0;height:auto}
.rw-mgmt-title h1{margin:0;color:#0b1220;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-0.01em}
.rw-mgmt-title p{margin:6px 0 0;color:#475569;font-size:14px;font-weight:500}
.rw-mgmt-actions{display:flex;align-items:center;gap:10px;flex-shrink:0}
.rw-mgmt-search{height:36px;min-width:220px;border:1px solid #e2e8f0;background:#ffffff;border-radius:8px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#475569;box-shadow:0 1px 2px rgba(15,23,42,0.03)}
.rw-mgmt-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:#0b1220;font-size:13px}
.rw-mgmt-search input::placeholder{color:#94a3b8}
.rw-mgmt-search svg{color:#94a3b8;flex-shrink:0}
.rw-mgmt-filter{height:36px!important;min-height:36px!important;padding:0 14px!important;border:1px solid #e2e8f0!important;background:#ffffff!important;border-radius:8px!important;color:#0b1220!important;font-size:13px!important;font-weight:600!important;gap:7px!important;box-shadow:0 1px 2px rgba(15,23,42,0.03)}
.rw-mgmt-filter:hover{background:#f8fafc!important;border-color:#cbd5e1!important}
.rw-mgmt-template{height:36px!important;min-height:36px!important;padding:0 14px!important;border:1px solid #cbd5e1!important;background:#ffffff!important;border-radius:8px!important;color:#0b1220!important;font-size:13px!important;font-weight:700!important;gap:7px!important;box-shadow:0 1px 2px rgba(15,23,42,0.03)}
.rw-mgmt-template:hover{background:#f8fffe!important;border-color:#0f838a!important;color:#0f838a!important}
.rw-mgmt-create{height:36px!important;min-height:36px!important;padding:0 16px!important;border:0!important;background:#0b3a2e!important;color:#ffffff!important;border-radius:8px!important;font-size:13px!important;font-weight:700!important;gap:7px!important;box-shadow:0 4px 12px rgba(11,58,46,0.18)}
.rw-mgmt-create:hover{background:#0f5240!important}

.rw-mgmt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin:8px 0 24px}
.rw-mgmt-stat{position:relative;background:#ffffff;border:1px solid #eef2f7;border-radius:14px;padding:18px 20px 16px;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:16px;row-gap:14px;box-shadow:0 1px 3px rgba(15,23,42,0.04)}
.rw-mgmt-stat-icon{grid-row:1;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}
.rw-mgmt-stat.tone-green .rw-mgmt-stat-icon{background:#dcfce7;color:#15803d}
.rw-mgmt-stat.tone-blue .rw-mgmt-stat-icon{background:#dbeafe;color:#1d4ed8}
.rw-mgmt-stat.tone-purple .rw-mgmt-stat-icon{background:#ede9fe;color:#6d28d9}
.rw-mgmt-stat.tone-orange .rw-mgmt-stat-icon{background:#ffedd5;color:#c2410c}
.rw-mgmt-stat-body{grid-row:1;align-self:center;min-width:0}
.rw-mgmt-stat-value{color:#0b1220;font-size:30px;font-weight:800;line-height:1;letter-spacing:-0.02em}
.rw-mgmt-stat-label{margin-top:6px;color:#0b1220;font-size:13px;font-weight:600}
.rw-mgmt-stat-foot{grid-column:1 / -1;grid-row:2;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #f1f5f9;padding-top:12px}
.rw-mgmt-stat-foot span{color:#64748b;font-size:12px;font-weight:500}
.rw-mgmt-stat-spark{flex-shrink:0}

.rw-mgmt-table-card{background:#ffffff;border:1px solid #eef2f7;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.04)}
.rw-mgmt-table-row{width:100%;min-height:72px;border:0;border-bottom:1px solid #f1f5f9;background:#ffffff;color:#0b1220;display:grid!important;grid-template-columns:40px minmax(0,1fr) 112px 160px 130px 42px;align-items:center;gap:12px;padding:0 16px;text-align:left;cursor:pointer;transition:background 120ms ease}
.rw-mgmt-table-row:hover:not(.head){background:#f8fafc}
.rw-mgmt-table-row.head{min-height:46px;background:#f8fafc;color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;cursor:default;pointer-events:none}
.rw-mgmt-table-row.head .cell-actions{text-align:right}
.rw-mgmt-table-row .cell-check{display:flex;align-items:center;justify-content:center}
.rw-mgmt-table-row .cell-check input{width:16px;height:16px;border:1.5px solid #cbd5e1;border-radius:4px;accent-color:#0b3a2e;cursor:pointer}
.rw-mgmt-table-row .cell-dataset{display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:12px;min-width:0}
.rw-mgmt-table-row .cell-dataset b{width:36px;height:36px;border-radius:8px;color:#ffffff;display:grid;place-items:center;flex-shrink:0}
.rw-mgmt-table-row .cell-dataset b.gold{background:#eab308}
.rw-mgmt-table-row .cell-dataset b.red{background:#dc2626}
.rw-mgmt-table-row .cell-dataset-text{min-width:0;display:grid;gap:3px}
.rw-mgmt-table-row .cell-dataset strong{color:#0b1220;font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-mgmt-table-row .cell-dataset small{display:flex;align-items:center;flex-wrap:wrap;gap:5px 8px;color:#64748b;font-size:12px;font-weight:500;line-height:1.3;overflow:visible;text-overflow:clip;white-space:normal}
.rw-mgmt-table-row .rw-id-chip{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:700;font-style:normal;letter-spacing:0.04em;flex-shrink:0}
.rw-mgmt-table-row .cell-status{display:flex}
.rw-status-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600}
.rw-status-pill i{width:6px;height:6px;border-radius:50%;display:inline-block}
.rw-status-pill.active{background:#dcfce7;color:#166534}
.rw-status-pill.active i{background:#16a34a}
.rw-status-pill.paused{background:#fef3c7;color:#92400e}
.rw-status-pill.paused i{background:#d97706}
.rw-mgmt-table-row .cell-owner{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:10px;min-width:0}
.rw-mgmt-table-row .cell-owner i{width:32px;height:32px;border-radius:50%;background:#7c3aed;color:#ffffff;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700;flex-shrink:0}
.rw-mgmt-table-row .cell-owner strong{display:block;color:#0b1220;font-size:13px;font-weight:600;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-mgmt-table-row .cell-owner small{display:block;margin-top:2px;color:#64748b;font-size:11px;font-weight:500}
.rw-mgmt-table-row .cell-date strong{display:block;color:#0b1220;font-size:13px;font-weight:600;line-height:1.2}
.rw-mgmt-table-row .cell-date small{display:block;margin-top:2px;color:#64748b;font-size:11px;font-weight:500}
.rw-mgmt-table-row .cell-actions{display:flex;align-items:center;justify-content:flex-end;color:#94a3b8;cursor:pointer;border-radius:6px;height:32px;width:32px;justify-self:end}
.rw-mgmt-table-row .cell-actions:hover{background:#f1f5f9;color:#0b1220}

.rw-mgmt-empty{padding:48px 24px}

.rw-mgmt-table-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 22px;border-top:1px solid #f1f5f9;background:#fbfcfd}
.rw-mgmt-count{color:#64748b;font-size:13px;font-weight:500}
.rw-mgmt-pagination{display:flex;align-items:center;gap:6px;margin-left:auto}
.rw-mgmt-page-nav{width:32px!important;height:32px!important;min-height:32px!important;padding:0!important;border:1px solid #e2e8f0!important;background:#ffffff!important;border-radius:6px!important;color:#64748b!important}
.rw-mgmt-page-nav:hover:not(:disabled){background:#f8fafc!important;color:#0b1220!important}
.rw-mgmt-page-nav:disabled{opacity:0.4;cursor:not-allowed}
.rw-mgmt-page-current{width:32px!important;height:32px!important;min-height:32px!important;padding:0!important;border:1px solid #0b3a2e!important;background:#ffffff!important;border-radius:6px!important;color:#0b3a2e!important;font-size:13px!important;font-weight:700!important;cursor:default!important}
.rw-mgmt-page-size{position:relative;display:inline-flex;align-items:center}
.rw-mgmt-page-size select{height:32px;padding:0 28px 0 12px;border:1px solid #e2e8f0;background:#ffffff;border-radius:6px;color:#0b1220;font-size:13px;font-weight:500;cursor:pointer;appearance:none;-webkit-appearance:none}
.rw-mgmt-page-size svg{position:absolute;right:10px;color:#94a3b8;pointer-events:none}

/* Pinned datasets strip */
.rw-mgmt-pinned{margin:0 0 22px}
.rw-mgmt-pinned > header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px}
.rw-mgmt-pinned > header h2{margin:0;color:#0b1220;font-size:15px;font-weight:700;letter-spacing:-0.005em}
.rw-mgmt-pinned > header p{margin:3px 0 0;color:#64748b;font-size:12px;font-weight:500}
.rw-mgmt-link-btn{height:32px!important;min-height:32px!important;padding:0 12px!important;border:0!important;background:transparent!important;color:#0b3a2e!important;font-size:12px!important;font-weight:700!important;border-radius:6px!important}
.rw-mgmt-link-btn:hover{background:#ecfdf5!important}
.rw-mgmt-pinned-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.rw-mgmt-pin-card{position:relative;min-height:120px!important;padding:16px 16px 14px!important;border:1px solid #eef2f7!important;background:#ffffff!important;border-radius:14px!important;color:#0b1220!important;display:grid!important;grid-template-rows:auto auto 1fr auto;gap:8px;text-align:left;align-items:start;justify-items:start;box-shadow:0 1px 3px rgba(15,23,42,0.04)}
.rw-mgmt-pin-card:hover{transform:translateY(-1px);border-color:#cbd5e1!important;box-shadow:0 6px 18px rgba(15,23,42,0.08)!important}
.rw-mgmt-pin-icon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;color:#ffffff}
.rw-mgmt-pin-card.tone-gold .rw-mgmt-pin-icon{background:#eab308}
.rw-mgmt-pin-card.tone-red .rw-mgmt-pin-icon{background:#dc2626}
.rw-mgmt-pin-card.tone-teal .rw-mgmt-pin-icon{background:#0f766e}
.rw-mgmt-pin-card.tone-violet .rw-mgmt-pin-icon{background:#7c3aed}
.rw-mgmt-pin-folder{color:#64748b;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase}
.rw-mgmt-pin-card strong{display:block;color:#0b1220;font-size:15px;font-weight:700;line-height:1.2;align-self:start;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rw-mgmt-pin-meta{display:flex;align-items:center;gap:8px;align-self:end;color:#64748b;font-size:11px;font-weight:500}
.rw-mgmt-pin-meta em{font-style:normal}
.rw-mgmt-pin-meta i{width:3px;height:3px;border-radius:50%;background:#cbd5e1}

/* Two-column main: table + activity sidebar */
.rw-mgmt-main{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}

/* Activity sidebar */
.rw-mgmt-activity{background:#ffffff;border:1px solid #eef2f7;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,0.04);padding:18px 18px 8px;position:sticky;top:20px}
.rw-mgmt-activity > header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px}
.rw-mgmt-activity > header h2{margin:0;color:#0b1220;font-size:14px;font-weight:700}
.rw-mgmt-activity > header p{margin:2px 0 0;color:#64748b;font-size:11px;font-weight:500}
.rw-mgmt-activity-list{list-style:none;padding:0;margin:0;display:grid;gap:2px}
.rw-mgmt-activity-item{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;padding:10px 8px;border-radius:8px;cursor:pointer;transition:background 120ms ease}
.rw-mgmt-activity-item:hover{background:#f8fafc}
.rw-mgmt-activity-item:focus-visible{outline:2px solid #0b3a2e;outline-offset:1px}
.rw-mgmt-activity-dot{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;margin-top:1px}
.rw-mgmt-activity-dot.tone-green{background:#dcfce7;color:#15803d}
.rw-mgmt-activity-dot.tone-blue{background:#dbeafe;color:#1d4ed8}
.rw-mgmt-activity-item p{margin:0;color:#0b1220;font-size:12px;font-weight:500;line-height:1.4}
.rw-mgmt-activity-item p strong{font-weight:700}
.rw-mgmt-activity-item p em{font-style:normal;font-weight:600;color:#0b3a2e}
.rw-mgmt-activity-item small{display:block;margin-top:2px;color:#94a3b8;font-size:11px;font-weight:500}
.rw-mgmt-activity-empty{padding:32px 12px;display:grid;justify-items:center;text-align:center;gap:6px;color:#64748b}
.rw-mgmt-activity-empty svg{color:#cbd5e1}
.rw-mgmt-activity-empty strong{color:#0b1220;font-size:13px;font-weight:700}
.rw-mgmt-activity-empty span{font-size:12px;color:#64748b}

@media (max-width: 1280px){
  .rw-mgmt-main{grid-template-columns:1fr}
  .rw-mgmt-activity{position:static}
}
@media (max-width: 1100px){
  .rw-mgmt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rw-mgmt-pinned-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rw-mgmt-table-row{grid-template-columns:40px minmax(0,1fr) 104px 150px 120px 42px;gap:10px;padding:0 14px}
}
@media (max-width: 780px){
  .rw-mgmt-stats{grid-template-columns:1fr}
  .rw-mgmt-pinned-strip{grid-template-columns:1fr}
  .rw-mgmt-header{flex-direction:column;align-items:stretch}
  .rw-mgmt-actions{flex-wrap:wrap}
  .rw-mgmt-table-row{grid-template-columns:32px minmax(0,1fr) 84px 34px;gap:8px;padding:0 10px}
  .rw-mgmt-table-row .cell-owner,
  .rw-mgmt-table-row .cell-date{display:none}
  .rw-mgmt-table-row.head span:nth-child(4),
  .rw-mgmt-table-row.head span:nth-child(5){display:none}
}
`
