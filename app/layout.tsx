import type { Metadata } from 'next'
import './globals.css'
import AppShell from '../components/AppShell'

export const metadata: Metadata = {
  title: 'WiseFlow',
  description: 'Construction business management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
