import ReworkDatasetsModule from '@/components/datasets/ReworkDatasetsModule'

type DatasetSection =
  | 'tables'
  | 'views'
  | 'imports'
  | 'relationships'
  | 'automations'
  | 'quality-rules'
  | 'access-keys'
  | 'history'
  | 'docs'
  | 'settings'

export default function DatasetSectionPage({ section }: { section: DatasetSection }) {
  return <ReworkDatasetsModule section={section} />
}
