'use client'

export const csrfHeader = { 'x-wiseflow-csrf': '1' } as const

export function withCsrfHeaders(headers: Record<string, string> = {}) {
  return { ...headers, ...csrfHeader }
}
