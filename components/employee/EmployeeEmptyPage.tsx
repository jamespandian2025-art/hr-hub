'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export default function EmployeeEmptyPage({
  title,
  subtitle,
  actionLabel,
  actionHref,
  children,
}: {
  title: string
  subtitle: string
  actionLabel?: string
  actionHref?: string
  children?: ReactNode
}) {
  return (
    <div className="employee-page">
      <div className="employee-page-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {actionLabel && actionHref && <Link className="employee-primary-button" href={actionHref}>{actionLabel}</Link>}
      </div>
      {children || (
        <section className="employee-panel" style={{ minHeight: 320, display: 'grid', placeItems: 'center', padding: 28, textAlign: 'center' }}>
          <div>
            <strong style={{ display: 'block', color: '#0f172a', fontSize: 18 }}>Nothing here yet.</strong>
            <p style={{ maxWidth: 440 }}>When HR publishes data for your employee profile, it will appear here automatically.</p>
          </div>
        </section>
      )}
    </div>
  )
}
