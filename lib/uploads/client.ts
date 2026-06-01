'use client'

import { withCsrfHeaders } from '@/lib/security/csrfClient'
import { getActiveCompany } from '@/lib/tenant/company'

export type UploadedObject = {
  objectKey: string
  name: string
  mimeType: string
  sizeBytes: number
  url: string
  storageProvider: 'supabase' | 'local'
}

function activeCompanyHeaders(headers: Record<string, string> = {}) {
  const companyId = getActiveCompany()?.id || storedAccountCompanyId()
  return {
    ...headers,
    ...(companyId ? { 'x-wiseflow-company-id': companyId } : {}),
  }
}

function storedAccountCompanyId() {
  if (typeof window === 'undefined') return ''
  for (const key of ['flowsys-auth-session', 'flowsys-account']) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{}') as { companyId?: string }
      if (parsed.companyId) return parsed.companyId
    } catch {
      // Ignore malformed local profile data.
    }
  }
  return ''
}

export async function uploadFileObject(file: File, purpose = 'general') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('purpose', purpose)
  const response = await fetch('/api/uploads', {
    method: 'POST',
    headers: activeCompanyHeaders(withCsrfHeaders()),
    body: formData,
  })
  const payload = await response.json().catch(() => null) as { ok?: boolean; file?: UploadedObject; error?: string } | null
  if (!response.ok || !payload?.ok || !payload.file) {
    throw new Error(payload?.error || 'File upload failed.')
  }
  return payload.file
}
