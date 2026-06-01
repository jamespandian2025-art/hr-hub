'use client'

import { getActiveCompany } from '@/lib/tenant/company'
import { withCsrfHeaders } from '@/lib/security/csrfClient'
import type { BusinessCollection } from './collections'

type BusinessResponse<T> =
  | { ok: true; records: T[] }
  | { ok: true; record: T }
  | { ok: true; deleted: boolean }
  | { ok: false; error: string }

function activeCompanyHeaders(headers: Record<string, string> = {}, companyId = getActiveCompany()?.id || '') {
  return {
    ...headers,
    ...(companyId ? { 'x-wiseflow-company-id': companyId } : {}),
  }
}

async function parseBusinessResponse<T>(response: Response) {
  const payload = await response.json().catch(() => null) as BusinessResponse<T> | null
  if (!response.ok || !payload?.ok) {
    const message = payload && 'error' in payload ? payload.error : 'Business records request failed.'
    throw new Error(message)
  }
  return payload
}

export async function listBusinessRecords<T extends object>(collection: BusinessCollection, companyId = getActiveCompany()?.id || '') {
  const response = await fetch(`/api/business-records/${collection}`, {
    headers: activeCompanyHeaders({}, companyId),
    cache: 'no-store',
  })
  const payload = await parseBusinessResponse<T>(response)
  return 'records' in payload ? payload.records : []
}

export async function upsertBusinessRecord<T extends object>(collection: BusinessCollection, record: T, companyId = getActiveCompany()?.id || '') {
  const response = await fetch(`/api/business-records/${collection}`, {
    method: 'POST',
    headers: activeCompanyHeaders(withCsrfHeaders({
      'Content-Type': 'application/json',
    }), companyId),
    body: JSON.stringify(record),
  })
  const payload = await parseBusinessResponse<T>(response)
  if (!('record' in payload)) throw new Error('Business records request did not return a record.')
  return payload.record
}

export async function replaceBusinessCollection<T extends object>(collection: BusinessCollection, records: T[], companyId = getActiveCompany()?.id || '') {
  const response = await fetch(`/api/business-records/${collection}`, {
    method: 'PUT',
    headers: activeCompanyHeaders(withCsrfHeaders({
      'Content-Type': 'application/json',
    }), companyId),
    body: JSON.stringify({ records }),
  })
  const payload = await parseBusinessResponse<T>(response)
  return 'records' in payload ? payload.records : []
}

export async function deleteBusinessRecord(collection: BusinessCollection, id: string, companyId = getActiveCompany()?.id || '') {
  const response = await fetch(`/api/business-records/${collection}/${encodeURIComponent(id)}?confirm=${encodeURIComponent(`DELETE ${id}`)}`, {
    method: 'DELETE',
    headers: activeCompanyHeaders(withCsrfHeaders(), companyId),
  })
  const payload = await parseBusinessResponse<Record<string, unknown>>(response)
  return 'deleted' in payload ? payload.deleted : false
}

export function readLegacyBusinessRows<T>(keys: string[], companyId = getActiveCompany()?.id) {
  if (typeof window === 'undefined') return [] as T[]
  const rows: T[] = []
  const seenKeys = new Set<string>()
  keys.flatMap(key => companyId ? [`${key}:${companyId}`, key] : [key]).forEach(key => {
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
      if (Array.isArray(parsed)) parsed.forEach(item => rows.push(item as T))
    } catch {
      // Ignore invalid legacy browser payloads during one-time migration.
    }
  })
  return rows
}

export function readLegacyBusinessObject<T>(keys: string[], companyId = getActiveCompany()?.id) {
  if (typeof window === 'undefined') return null
  for (const key of keys.flatMap(item => companyId ? [`${item}:${companyId}`, item] : [item])) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || 'null') as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T
    } catch {
      // Ignore invalid legacy browser payloads during one-time migration.
    }
  }
  return null
}

export function clearLegacyBusinessRows(keys: string[], companyId = getActiveCompany()?.id) {
  if (typeof window === 'undefined') return
  const seenKeys = new Set<string>()
  keys.flatMap(key => companyId ? [`${key}:${companyId}`, key] : [key]).forEach(key => {
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    window.localStorage.removeItem(key)
  })
}
