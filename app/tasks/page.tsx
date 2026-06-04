import { redirect } from 'next/navigation'

type SearchParams = Record<string, string | string[] | undefined>

function withSearchParams(path: string, params?: SearchParams) {
  const query = new URLSearchParams()

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => query.append(key, item))
      return
    }
    if (value !== undefined) query.set(key, value)
  })

  const search = query.toString()
  return search ? `${path}?${search}` : path
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  redirect(withSearchParams('/workflows/my-jobs', searchParams ? await searchParams : undefined))
}
