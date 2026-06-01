'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/StateFeedback'

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
    <ErrorState
      size="page"
      title="Something went wrong"
      message="We could not load this page properly. Please try again. If this keeps happening, contact your system admin."
      actions={(
        <>
          <button type="button" className="wf-state__primary" onClick={reset}>Try again</button>
          <button type="button" className="wf-state__secondary" onClick={() => window.location.assign('/')}>Go home</button>
        </>
      )}
    />
  )
}
