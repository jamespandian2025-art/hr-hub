'use client'

import type { HrCollection } from './permissions'

type StoredActor = {
  userId?: string
  id?: string
  fullName?: string
  name?: string
  email?: string
  role?: string
}

function parseStoredActor(key: string): StoredActor {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as StoredActor : {}
  } catch {
    return {}
  }
}

function actorHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const actor = {
    ...parseStoredActor('flowsys-auth-session'),
    ...parseStoredActor('flowsys-account'),
  }
  return {
    'x-hr-user-id': actor.userId || actor.id || '',
    'x-hr-user-name': actor.fullName || actor.name || actor.email || 'System User',
    'x-hr-role': actor.role || 'Employee',
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'HR backend request failed.')
  }
  return payload as T
}

export async function listHrRecords<T>(collection: HrCollection, headers: Record<string, string> = {}) {
  const response = await fetch(`/api/hr/records/${collection}`, {
    headers: {
      ...actorHeaders(),
      ...headers,
    },
    cache: 'no-store',
  })
  const payload = await parseResponse<{ ok: true; records: T[] }>(response)
  return payload.records
}

export async function createHrRecord<T>(collection: HrCollection, record: Record<string, unknown>) {
  const response = await fetch(`/api/hr/records/${collection}`, {
    method: 'POST',
    headers: {
      ...actorHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  })
  const payload = await parseResponse<{ ok: true; record: T }>(response)
  return payload.record
}

export async function updateHrRecord<T>(collection: HrCollection, id: string, patch: Record<string, unknown>) {
  const response = await fetch(`/api/hr/records/${collection}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      ...actorHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })
  const payload = await parseResponse<{ ok: true; record: T }>(response)
  return payload.record
}
