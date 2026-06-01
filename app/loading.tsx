import { LoadingState } from '@/components/StateFeedback'

export default function Loading() {
  return (
    <LoadingState
      size="page"
      title="Loading workspace"
      message="Preparing the latest WiseFlow data for this view."
    />
  )
}
