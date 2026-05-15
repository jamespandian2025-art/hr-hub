import type { Metadata } from 'next'
import { Unbounded } from 'next/font/google'
import './globals.css'
import AppShell from '../components/AppShell'

const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-unbounded',
})

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
    <html lang="en" className={unbounded.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
