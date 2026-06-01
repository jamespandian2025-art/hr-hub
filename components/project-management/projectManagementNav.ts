import {
  Archive,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  WalletCards,
} from 'lucide-react'

export const projectManagementNavItems = [
  { label: 'Overview',  href: '/project-management',           icon: LayoutDashboard,    description: 'Project health, budgets, and delivery status' },
  { label: 'Projects',  href: '/project-management/projects',  icon: BriefcaseBusiness,  description: 'Portfolio list, owners, clients, and progress' },
  { label: 'Archived',  href: '/project-management/archived',  icon: Archive,            description: 'Archived project records and delivery history' },
  { label: 'Budget',    href: '/project-management/budget',    icon: WalletCards,        description: 'Budget tracking, burn rate, and forecasts' },
  { label: 'Documents', href: '/project-management/documents', icon: FileText,           description: 'Files attached to every project' },
] as const

export type ProjectManagementTab = typeof projectManagementNavItems[number]['label']

export const projectManagementTabs = projectManagementNavItems.map(item => item.label) as readonly ProjectManagementTab[]

export const projectManagementPathToTab = Object.fromEntries(
  projectManagementNavItems.map(item => [item.href, item.label]),
) as Record<string, ProjectManagementTab>

export const projectManagementTabToPath = Object.fromEntries(
  projectManagementNavItems.map(item => [item.label, item.href]),
) as Record<ProjectManagementTab, string>

export const projectManagementViewToTab = Object.fromEntries(
  projectManagementNavItems.map(item => [
    item.href === '/project-management' ? 'overview' : item.href.split('/').filter(Boolean).at(-1) || 'overview',
    item.label,
  ]),
) as Record<string, ProjectManagementTab>

export function getProjectManagementRouteMeta(pathname: string) {
  const exactMatch = projectManagementNavItems.find(item => pathname === item.href)
  if (exactMatch) return exactMatch

  return [...projectManagementNavItems]
    .filter(item => item.href !== '/project-management')
    .sort((a, b) => b.href.length - a.href.length)
    .find(item => pathname.startsWith(`${item.href}/`)) || projectManagementNavItems[0]
}
