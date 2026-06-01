'use client'

import { useEffect } from 'react'
import { withCsrfHeaders } from '@/lib/security/csrfClient'
import { getActiveCompany } from '@/lib/tenant/company'

type MonitoringEvent = {
  type: string
  message: string
  path?: string
  url?: string
  method?: string
  status?: number
  stack?: string
}

function monitoringHeaders() {
  const companyId = getActiveCompany()?.id || ''
  return {
    ...withCsrfHeaders({ 'Content-Type': 'application/json' }),
    ...(companyId ? { 'x-wiseflow-company-id': companyId } : {}),
  }
}

export default function ClientMonitoring() {
  useEffect(() => {
    const reported = new Set<string>()
    const originalFetch = window.fetch.bind(window)

    const report = (event: MonitoringEvent) => {
      const key = `${event.type}:${event.path || event.url}:${event.message}:${event.status || ''}`.slice(0, 500)
      if (reported.has(key)) return
      reported.add(key)
      if (reported.size > 80) reported.clear()
      originalFetch('/api/monitoring/client-errors', {
        method: 'POST',
        headers: monitoringHeaders(),
        body: JSON.stringify({
          ...event,
          path: event.path || window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => undefined)
    }

    const onError = (event: ErrorEvent) => {
      report({
        type: 'runtime-error',
        message: event.message || 'Unhandled browser error',
        path: window.location.pathname,
        stack: event.error?.stack,
      })
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      report({
        type: 'unhandled-rejection',
        message: reason instanceof Error ? reason.message : String(reason || 'Unhandled promise rejection'),
        path: window.location.pathname,
        stack: reason instanceof Error ? reason.stack : undefined,
      })
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const response = await originalFetch(input, init)
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        if (response.status >= 500 && !url.includes('/api/monitoring/client-errors')) {
          report({
            type: 'api-failure',
            message: `API request failed with ${response.status}`,
            url,
            method: init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET'),
            status: response.status,
          })
        }
        return response
      } catch (error) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        if (!url.includes('/api/monitoring/client-errors')) {
          report({
            type: 'api-network-error',
            message: error instanceof Error ? error.message : 'Network request failed',
            url,
            method: init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET'),
          })
        }
        throw error
      }
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.fetch = originalFetch
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
