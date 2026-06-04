'use client'

import Link from 'next/link'
import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export default function EmployeeEmptyPage({
  title,
  subtitle,
  actionLabel,
  actionHref,
  icon: Icon = Inbox,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'When HR publishes data for your employee profile, it will appear here automatically.',
  children,
}: {
  title: string
  subtitle: string
  actionLabel?: string
  actionHref?: string
  icon?: LucideIcon
  emptyTitle?: string
  emptyBody?: string
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
        <section
          className="employee-panel"
          style={{ minHeight: 320, display: 'grid', placeItems: 'center', padding: 28, textAlign: 'center' }}
          role="status"
          aria-live="polite"
        >
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12, maxWidth: 460 }}>
            <span
              aria-hidden="true"
              style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: '#ecfdf5', color: '#15803d' }}
            >
              <Icon size={26} />
            </span>
            <strong style={{ display: 'block', color: '#0f172a', fontSize: 18 }}>{emptyTitle}</strong>
            <p style={{ margin: 0, color: '#000000', lineHeight: 1.5 }}>{emptyBody}</p>
            {actionLabel && actionHref && (
              <Link className="employee-primary-button" href={actionHref} style={{ marginTop: 4 }}>{actionLabel}</Link>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
