'use client'

import { withCsrfHeaders } from '@/lib/security/csrfClient'
import { getActiveCompany } from '@/lib/tenant/company'
import type { HrCollection } from './permissions'

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'HR backend request failed.')
  }
  return payload as T
}

function activeCompanyHeaders(headers: Record<string, string> = {}) {
  const companyId = getActiveCompany()?.id || ''
  return {
    ...headers,
    ...(companyId ? { 'x-wiseflow-company-id': companyId } : {}),
  }
}

export async function listHrRecords<T>(collection: HrCollection, headers: Record<string, string> = {}) {
  const response = await fetch(`/api/hr/records/${collection}`, {
    headers: activeCompanyHeaders(headers),
    cache: 'no-store',
  })
  const payload = await parseResponse<{ ok: true; records: T[] }>(response)
  return payload.records
}

export async function createHrRecord<T>(collection: HrCollection, record: Record<string, unknown>) {
  const response = await fetch(`/api/hr/records/${collection}`, {
    method: 'POST',
    headers: activeCompanyHeaders(withCsrfHeaders({
      'Content-Type': 'application/json',
    })),
    body: JSON.stringify(record),
  })
  const payload = await parseResponse<{ ok: true; record: T }>(response)
  return payload.record
}

export async function updateHrRecord<T>(collection: HrCollection, id: string, patch: Record<string, unknown>) {
  const response = await fetch(`/api/hr/records/${collection}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: activeCompanyHeaders(withCsrfHeaders({
      'Content-Type': 'application/json',
    })),
    body: JSON.stringify(patch),
  })
  const payload = await parseResponse<{ ok: true; record: T }>(response)
  return payload.record
}

export async function deleteHrRecord<T = Record<string, unknown>>(collection: HrCollection, id: string) {
  // The DELETE route requires an explicit confirmation token of `DELETE <id>`,
  // passed via header (matches the server contract in the [id] route).
  const response = await fetch(`/api/hr/records/${collection}/${encodeURIComponent(id)}?confirm=${encodeURIComponent(`DELETE ${id}`)}`, {
    method: 'DELETE',
    headers: activeCompanyHeaders(withCsrfHeaders({
      'x-wiseflow-confirm-delete': `DELETE ${id}`,
    })),
  })
  const payload = await parseResponse<{ ok: true; deleted: T }>(response)
  return payload.deleted
}
