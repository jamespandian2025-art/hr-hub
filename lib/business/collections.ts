import type { PermissionArea } from '@/lib/security/rbac'

export const businessCollections = [
  'clients',
  'contacts',
  'opportunities',
  'sales-workspace',
  'accounting-invoices',
  'accounting-bills',
  'accounting-expenses',
  'accounting-bank-accounts',
  'accounting-transactions',
  'accounting-budgets',
  'accounting-tax-obligations',
  'accounting-audit-events',
  'project-management-state',
  'project-legacy-records',
  'project-tasks',
  'project-messages',
  'project-attachments',
  'project-progress',
  'project-change-orders',
  'assigned-tasks',
  'warehouse-state',
  'warehouse-inventory',
  'warehouse-locations',
  'warehouse-receiving',
  'warehouse-transfers',
  'warehouse-adjustments',
  'warehouse-movements',
  'suppliers',
  'pricebook-items',
  'procurement-purchase-requests',
  'procurement-purchase-orders',
  'procurement-rfqs',
  'procurement-rfq-published',
  'procurement-quotations',
  'procurement-notifications',
  'procurement-receiving',
  'workflow-state',
  'workflow-jobs',
  'workflow-todos',
  'dataset-state',
  'account-workspace',
] as const

export type BusinessCollection = (typeof businessCollections)[number]

const businessCollectionSet = new Set<string>(businessCollections)

export function isBusinessCollection(value: string): value is BusinessCollection {
  return businessCollectionSet.has(value)
}

export function assertBusinessCollection(value: string) {
  if (!isBusinessCollection(value)) {
    throw Object.assign(new Error('Unknown business record collection.'), { status: 404 })
  }
  return value
}

export function areaForBusinessCollection(collection: BusinessCollection): PermissionArea {
  if (collection.startsWith('accounting-')) return 'finance'
  if (collection.startsWith('warehouse-')) return 'general'
  if (collection.startsWith('procurement-')) return 'general'
  if (collection.startsWith('project-') || collection === 'project-management-state' || collection === 'assigned-tasks') return 'general'
  if (collection.startsWith('workflow-')) return 'general'
  if (collection.startsWith('dataset-')) return 'general'
  if (collection === 'clients' || collection === 'contacts' || collection === 'opportunities' || collection === 'sales-workspace') return 'general'
  return 'general'
}
