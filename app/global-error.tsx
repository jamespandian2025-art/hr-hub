'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/StateFeedback'

export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset?: () => void
  unstable_retry?: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const retry = unstable_retry || reset || (() => window.location.reload())

  return (
    <html lang="en">
      <body>
        <style>{criticalStateCss}</style>
        <ErrorState
          size="page"
          title="WiseFlow needs a refresh"
          message="The app hit an unexpected error before the workspace could finish loading."
          actions={(
            <>
              <button type="button" className="wf-state__primary" onClick={retry}>Try again</button>
              <button type="button" className="wf-state__secondary" onClick={() => window.location.assign('/')}>Go home</button>
            </>
          )}
        />
      </body>
    </html>
  )
}

const criticalStateCss = `
html,body{margin:0;min-height:100%;background:#000;color:#ededed;font-family:Arial,sans-serif}
.wf-state{min-height:100vh;display:grid;place-items:center;align-content:center;gap:12px;padding:24px;text-align:center}
.wf-state__icon{width:54px;height:54px;border:1px solid #3a1510;border-radius:10px;display:grid;place-items:center;background:#1f0f0d;color:#f87171}
.wf-state h1{margin:0;font-size:24px;color:#ededed}
.wf-state p{max-width:520px;margin:0;color:#a1a1a1;line-height:1.6}
.wf-state__actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px}
.wf-state__primary,.wf-state__secondary{min-height:40px;border-radius:8px;padding:0 16px;font-weight:850;cursor:pointer}
.wf-state__primary{border:1px solid #ededed;background:#ededed;color:#000}
.wf-state__secondary{border:1px solid #2a2a2a;background:#0a0a0a;color:#ededed}
`
