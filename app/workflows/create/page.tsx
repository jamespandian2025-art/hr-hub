import { Suspense } from 'react'
import { CreateWorkflowPageClient } from '../workflow-ui'

export default function CreateWorkflowPage() {
  return (
    <Suspense fallback={null}>
      <CreateWorkflowPageClient />
    </Suspense>
  )
}
