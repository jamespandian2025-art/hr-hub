'use client'

import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'

type Metric = {
  label: string
  value: string
  tone?: 'green' | 'yellow' | 'red' | 'blue'
}

type Action = {
  label: string
  href: string
}

type HrModulePageProps = {
  title: string
  subtitle: string
  metrics: Metric[]
  actions?: Action[]
}

const toneClass: Record<NonNullable<Metric['tone']>, string> = {
  green: 'hr-metric-dot-green',
  yellow: 'hr-metric-dot-yellow',
  red: 'hr-metric-dot-red',
  blue: 'hr-metric-dot-blue',
}

export default function HrModulePage({ title, subtitle, metrics, actions = [] }: HrModulePageProps) {
  return (
    <section className="hr-module-page">
      <div className="hr-module-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <Link href="/hr/employees/new" className="hr-module-action">
          <Plus size={15} />
          Add employee
        </Link>
      </div>

      <div className="hr-module-metrics">
        {metrics.map(metric => (
          <article key={metric.label} className="hr-module-card">
            <span className={toneClass[metric.tone ?? 'green']} />
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <div className="hr-module-panel">
        <div>
          <h2>{title} workspace</h2>
          <p>
            This section is part of the separate HR Hub workspace. It uses the same company session, but its navigation,
            records, and future permissions stay scoped to HR.
          </p>
        </div>
        <div className="hr-module-links">
          {(actions.length ? actions : [
            { label: 'Open employees', href: '/hr/employees' },
            { label: 'View reports', href: '/hr/reports' },
          ]).map(action => (
            <Link key={action.href + action.label} href={action.href}>
              {action.label}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
