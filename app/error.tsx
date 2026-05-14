'use client'

import { useEffect } from 'react'

export default function AppError({
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
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={markStyle}>!</div>
        <h1 style={titleStyle}>Something went wrong</h1>
        <p style={copyStyle}>
          We could not load this page properly. Please try again. If this keeps happening, contact your system admin.
        </p>
        <div style={actionsStyle}>
          <button type="button" onClick={reset} style={primaryButtonStyle}>Try again</button>
          <button type="button" onClick={() => window.location.assign('/')} style={secondaryButtonStyle}>Go home</button>
        </div>
      </section>
    </main>
  )
}

const pageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: '#f8fafc',
  fontFamily: 'var(--font-body)',
} as const

const cardStyle = {
  width: 'min(460px, 100%)',
  border: '1px solid #dbe4ee',
  borderRadius: 16,
  background: '#ffffff',
  boxShadow: '0 24px 70px rgba(15, 23, 42, .12)',
  padding: 28,
  textAlign: 'center',
} as const

const markStyle = {
  width: 46,
  height: 46,
  margin: '0 auto 14px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: '#fee2e2',
  color: '#b91c1c',
  fontSize: 22,
  fontWeight: 900,
} as const

const titleStyle = { margin: 0, color: '#0f172a', fontSize: 24 } as const
const copyStyle = { margin: '10px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.6 } as const
const actionsStyle = { display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' } as const
const primaryButtonStyle = { minHeight: 40, border: '1px solid #16a34a', borderRadius: 8, background: '#16a34a', color: '#fff', padding: '0 16px', fontWeight: 850, cursor: 'pointer' } as const
const secondaryButtonStyle = { minHeight: 40, border: '1px solid #dbe4ee', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 16px', fontWeight: 850, cursor: 'pointer' } as const
