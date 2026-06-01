import ProjectTaskDetailsPage from '@/components/project-management/ProjectTaskDetailsPage'

export default async function ProjectManagementTaskDetailRoute({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  return <ProjectTaskDetailsPage taskId={taskId} />
}
