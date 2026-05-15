import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import './globals.css'
import AppShell from '../components/AppShell'

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
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
    <html lang="en" className={publicSans.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
