import AccountPageContent from '@/components/account/AccountPages'
import { getAccountWorkspaceForCurrentSession } from '@/lib/account/serverStore'

export default async function AccountPage() {
  const workspace = await getAccountWorkspaceForCurrentSession()
  return <AccountPageContent view="general-info" initialWorkspace={workspace} />
}
