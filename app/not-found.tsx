import Link from 'next/link'
import { NotFoundState } from '@/components/StateFeedback'

export default function NotFound() {
  return (
    <NotFoundState
      size="page"
      title="Page not found"
      message="This page may have moved, or the record is no longer available in this workspace."
      actions={(
        <>
          <Link className="wf-state__primary" href="/dashboard">Open dashboard</Link>
          <Link className="wf-state__secondary" href="/project-management">Project Management</Link>
        </>
      )}
    />
  )
}
