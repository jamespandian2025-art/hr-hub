import AccountShell from '@/components/account/AccountShell'
import { getAccountWorkspaceForCurrentSession } from '@/lib/account/serverStore'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getAccountWorkspaceForCurrentSession()
  return (
    <AccountShell
      viewerName={workspace.viewer.name}
      companyName={workspace.company.name}
    >
      {children}
    </AccountShell>
  )
}
