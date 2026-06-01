import { WorkflowDetailPageClient } from '../workflow-ui'

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkflowDetailPageClient workflowId={id} />
}
