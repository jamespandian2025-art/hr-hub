import RfqResponseClient from './RfqResponseClient'

export const dynamic = 'force-dynamic'

export default async function RfqResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <RfqResponseClient token={token} />
}
