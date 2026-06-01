import {
  ClipboardCheck,
  GitCompareArrows,
  PackageCheck,
  Send,
  ShoppingCart,
  Trophy,
  Warehouse,
} from 'lucide-react'

export type ProcurementLifecycleKey =
  | 'purchaseRequests'
  | 'rfqs'
  | 'supplierComparison'
  | 'awardedSuppliers'
  | 'purchaseOrders'
  | 'receiving'
  | 'warehouseInventory'

export const procurementLifecycleSteps = [
  {
    key: 'purchaseRequests',
    label: 'Purchase Request',
    shortLabel: 'Request',
    href: '/procurement/purchase-requests',
    icon: ClipboardCheck,
    description: 'Internal department request before any supplier commitment.',
  },
  {
    key: 'rfqs',
    label: 'RFQ',
    shortLabel: 'RFQ',
    href: '/procurement/rfqs',
    icon: Send,
    description: 'Manually invite relevant suppliers to submit quotations.',
  },
  {
    key: 'supplierComparison',
    label: 'Supplier Comparison',
    shortLabel: 'Compare',
    href: '/procurement/vendor-comparison',
    icon: GitCompareArrows,
    description: 'Compare pricing, lead time, supplier ratings, and delivery performance.',
  },
  {
    key: 'awardedSuppliers',
    label: 'Award Supplier',
    shortLabel: 'Award',
    href: '/procurement/rfqs',
    icon: Trophy,
    description: 'Select the winning supplier before creating the official order.',
  },
  {
    key: 'purchaseOrders',
    label: 'Purchase Order',
    shortLabel: 'PO',
    href: '/procurement/purchase-orders',
    icon: ShoppingCart,
    description: 'Official supplier commitment with items, pricing, taxes, terms, and delivery schedule.',
  },
  {
    key: 'receiving',
    label: 'Receiving',
    shortLabel: 'Receive',
    href: '/procurement/receiving',
    icon: PackageCheck,
    description: 'Confirm delivered quantities, damaged items, shortages, and delivery status.',
  },
  {
    key: 'warehouseInventory',
    label: 'Warehouse Inventory Update',
    shortLabel: 'Inventory',
    href: '/warehouse/inventory',
    icon: Warehouse,
    description: 'Completed receiving records update stock and create movement history.',
  },
] as const

export const procurementGuideNotes = [
  'Purchase Requests are internal requests, not supplier orders.',
  'RFQs are sent only to manually selected relevant suppliers.',
  'Purchase Orders can come from an approved RFQ, direct procurement, or an approved purchase request.',
  'Supplier Database remains a separate vendor relationship management workspace.',
] as const
