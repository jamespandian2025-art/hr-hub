import { Suspense } from 'react'
import { AddWorkflowJobPageClient } from '../../workflow-ui'

export default async function AddWorkflowJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <AddWorkflowJobPageClient workflowId={id} />
    </Suspense>
  )
}
