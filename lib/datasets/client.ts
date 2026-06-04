'use client'

import { withCsrfHeaders } from '@/lib/security/csrfClient'

function companyHeaders(companyId: string, headers: Record<string, string> = {}) {
  return {
    ...headers,
    ...(companyId ? { 'x-wiseflow-company-id': companyId } : {}),
  }
}

function workspaceUrl(companyId: string) {
  return `/api/datasets/workspace${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`
}

// Returns the company's stored workspace document, or null when none has been
// saved on the server yet. Throws on auth/network errors so callers can decide
// whether to fall back to the local copy.
export async function fetchDatasetWorkspace(companyId: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(workspaceUrl(companyId), {
    headers: companyHeaders(companyId),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as { ok?: boolean; state?: Record<string, unknown> | null; error?: string } | null
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Could not load datasets from the server.')
  }
  return payload.state ?? null
}

export async function saveDatasetWorkspace(companyId: string, state: unknown): Promise<void> {
  const response = await fetch(workspaceUrl(companyId), {
    method: 'PUT',
    headers: companyHeaders(companyId, withCsrfHeaders({ 'Content-Type': 'application/json' })),
    body: JSON.stringify(state),
  })
  const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Could not save datasets to the server.')
  }
}
