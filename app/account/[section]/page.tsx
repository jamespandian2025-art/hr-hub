import { notFound } from 'next/navigation'
import AccountPageContent, { type AccountView } from '@/components/account/AccountPages'
import { getAccountWorkspaceForCurrentSession } from '@/lib/account/serverStore'

const accountViews = new Set<string>([
  'my-account',
  'account-security',
  'applications',
  'users',
  'guests',
  'user-groups',
  'general-info',
  'offices',
  'admin-roles',
  'customizations',
  'system-settings',
])

export default async function AccountSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!accountViews.has(section)) notFound()
  const workspace = await getAccountWorkspaceForCurrentSession()
  return <AccountPageContent view={section as AccountView} initialWorkspace={workspace} />
}
