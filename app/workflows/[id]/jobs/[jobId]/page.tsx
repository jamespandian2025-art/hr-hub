import { WorkflowJobDetailPageClient } from '../../../workflow-ui'

export default async function WorkflowJobDetailPage({ params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { id, jobId } = await params
  return <WorkflowJobDetailPageClient workflowId={id} jobId={jobId} />
}
