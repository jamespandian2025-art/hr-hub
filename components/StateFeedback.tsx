import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, SearchX } from 'lucide-react'

type StateFeedbackTone = 'empty' | 'error' | 'loading' | 'not-found'
type StateFeedbackSize = 'page' | 'section' | 'compact'

type StateFeedbackProps = {
  tone?: StateFeedbackTone
  size?: StateFeedbackSize
  title: string
  message?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

const defaultIcons: Record<StateFeedbackTone, ReactNode> = {
  empty: <Inbox size={28} />,
  error: <AlertTriangle size={28} />,
  loading: <LoadingGlyph />,
  'not-found': <SearchX size={28} />,
}

function LoadingGlyph() {
  return (
    <span className="wf-loader-mark" aria-hidden="true">
      <span className="wf-loader-mark__ring" />
      <span className="wf-loader-mark__center" />
    </span>
  )
}

export default function StateFeedback({
  tone = 'empty',
  size = 'section',
  title,
  message,
  icon,
  actions,
  className,
}: StateFeedbackProps) {
  const classes = ['wf-state', `wf-state--${tone}`, `wf-state--${size}`, className].filter(Boolean).join(' ')
  const isLoading = tone === 'loading'
  const role = tone === 'error' ? 'alert' : 'status'

  return (
    <section className={classes} role={role} aria-live={tone === 'error' ? 'assertive' : 'polite'} aria-busy={isLoading || undefined}>
      <span className="wf-state__icon" aria-hidden="true">{icon || defaultIcons[tone]}</span>
      <h1>{title}</h1>
      {message ? <p>{message}</p> : null}
      {isLoading ? (
        <span className="wf-state__progress" aria-hidden="true">
          <span className="wf-state__progress-bar" />
        </span>
      ) : null}
      {actions ? <div className="wf-state__actions">{actions}</div> : null}
    </section>
  )
}

export function EmptyState(props: Omit<StateFeedbackProps, 'tone'>) {
  return <StateFeedback {...props} tone="empty" />
}

export function ErrorState(props: Omit<StateFeedbackProps, 'tone'>) {
  return <StateFeedback {...props} tone="error" />
}

export function LoadingState(props: Omit<StateFeedbackProps, 'tone'>) {
  return <StateFeedback {...props} tone="loading" />
}

export function NotFoundState(props: Omit<StateFeedbackProps, 'tone'>) {
  return <StateFeedback {...props} tone="not-found" />
}
