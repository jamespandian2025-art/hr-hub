import AccountingShell from '@/components/accounting/AccountingShell'

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return <AccountingShell>{children}</AccountingShell>
}
