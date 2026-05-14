'use client'

import { useEffect } from 'react'

export default function EmployeePortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="employee-page" style={pageStyle}>
      <section className="employee-panel" style={cardStyle}>
        <div style={markStyle}>!</div>
        <h1 style={titleStyle}>We could not load this employee page</h1>
        <p style={copyStyle}>
          Your request is safe. Please try again, or return to your dashboard and continue from there.
        </p>
        <div style={actionsStyle}>
          <button type="button" onClick={reset} className="employee-primary-button">Try again</button>
          <button type="button" onClick={() => window.location.assign('/employee/dashboard')} className="employee-secondary-button">Back to dashboard</button>
        </div>
      </section>
    </div>
  )
}

const pageStyle = {
  display: 'grid',
  placeItems: 'center',
  background: '#f4f8f5',
} as const

const cardStyle = {
  width: 'min(520px, 100%)',
  padding: 30,
  textAlign: 'center',
  boxShadow: '0 24px 70px rgba(15, 23, 42, .08)',
} as const

const markStyle = {
  width: 46,
  height: 46,
  margin: '0 auto 14px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: '#fef3c7',
  color: '#b45309',
  fontSize: 22,
  fontWeight: 900,
} as const

const titleStyle = { margin: 0, color: '#0f172a', fontSize: 24 } as const
const copyStyle = { margin: '10px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.6 } as const
const actionsStyle = { display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' } as const
