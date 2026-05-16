import {
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitCompareArrows,
  Handshake,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ProcurementWorkspaceMenuItem = {
  label: string
  href: string
  icon: LucideIcon
  description: string
}

export const procurementWorkspaceMenu: ProcurementWorkspaceMenuItem[] = [
  { label: 'Overview', href: '/procurement', icon: LayoutDashboard, description: 'Purchasing snapshot and activity' },
  { label: 'Pricebook', href: '/procurement/pricebook', icon: ReceiptText, description: 'Items, catalog, and pricing' },
  { label: 'Purchase Requests', href: '/procurement/purchase-requests', icon: FileText, description: 'Requests waiting for review' },
  { label: 'RFQs', href: '/procurement/rfqs', icon: ClipboardCheck, description: 'Supplier requests for quotation' },
  { label: 'Quotations', href: '/procurement/quotations', icon: FileCheck2, description: 'Supplier quotes and bid responses' },
  { label: 'Purchase Orders', href: '/procurement/purchase-orders', icon: ShoppingCart, description: 'Orders and supplier commitments' },
  { label: 'Approvals', href: '/procurement/approvals', icon: Handshake, description: 'Procurement reviews and approvals' },
  { label: 'Receiving', href: '/procurement/receiving', icon: Truck, description: 'Deliveries and received items' },
  { label: 'Vendor Comparison', href: '/procurement/vendor-comparison', icon: GitCompareArrows, description: 'Compare suppliers, quotes, and terms' },
  { label: 'Contracts', href: '/procurement/contracts', icon: FileText, description: 'Supplier contracts and commitments' },
  { label: 'Procurement Analytics', href: '/procurement/analytics', icon: BarChart3, description: 'Spend, sourcing, and supplier analytics' },
  { label: 'Settings', href: '/procurement/settings', icon: Settings, description: 'Procurement workspace controls' },
]

export function getProcurementRouteMeta(pathname: string) {
  return procurementWorkspaceMenu.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`)) || procurementWorkspaceMenu[0]
}
