'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/StateFeedback'

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
    <ErrorState
      size="page"
      title="We could not load this employee page"
      message="Your request is safe. Please try again, or return to your dashboard and continue from there."
      actions={(
        <>
          <button type="button" onClick={reset} className="wf-state__primary">Try again</button>
          <button type="button" onClick={() => window.location.assign('/employee/dashboard')} className="wf-state__secondary">Back to dashboard</button>
        </>
      )}
    />
  )
}
