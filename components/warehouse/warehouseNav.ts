import {
  AlertTriangle,
  ArchiveRestore,
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  MapPinned,
  PackageCheck,
  SlidersHorizontal,
  Truck,
} from 'lucide-react'

export const warehouseNavItems = [
  { label: 'Overview', href: '/warehouse', icon: LayoutDashboard, description: 'Inventory health and warehouse command center' },
  { label: 'Inventory', href: '/warehouse/inventory', icon: Boxes, description: 'Items, SKUs, stock levels, and availability' },
  { label: 'Stock Movements', href: '/warehouse/stock-movements', icon: ArchiveRestore, description: 'Complete inventory movement traceability' },
  { label: 'Receiving Logs', href: '/warehouse/receiving-logs', icon: PackageCheck, description: 'Supplier deliveries and received goods' },
  { label: 'Transfers', href: '/warehouse/transfers', icon: Truck, description: 'Move stock between warehouses and project sites' },
  { label: 'Adjustments', href: '/warehouse/adjustments', icon: SlidersHorizontal, description: 'Correct stock counts, damages, and write-offs' },
  { label: 'Locations', href: '/warehouse/locations', icon: MapPinned, description: 'Zones, racks, shelves, levels, and capacity' },
  { label: 'Low Stock', href: '/warehouse/low-stock', icon: AlertTriangle, description: 'Low, critical, and reorder recommendations' },
  { label: 'New Item', href: '/warehouse/inventory/new', icon: Boxes, description: 'Create a new inventory item', hidden: true },
  { label: 'Receiving', href: '/warehouse/receiving-logs/new', icon: ClipboardCheck, description: 'Record goods received into warehouse', hidden: true },
]

export function getWarehouseRouteMeta(pathname: string) {
  if (pathname.startsWith('/warehouse/inventory/new')) return warehouseNavItems[8]
  if (pathname.startsWith('/warehouse/receiving-logs/new')) return warehouseNavItems[9]
  if (pathname.startsWith('/warehouse/transfers/new')) return { ...warehouseNavItems[4], label: 'New Transfer' }
  if (pathname.startsWith('/warehouse/adjustments/new')) return { ...warehouseNavItems[5], label: 'New Adjustment' }
  if (pathname.startsWith('/warehouse/locations/new')) return { ...warehouseNavItems[6], label: 'New Location' }
  return warehouseNavItems.find(item => !item.hidden && (pathname === item.href || pathname.startsWith(item.href + '/'))) || warehouseNavItems[0]
}
