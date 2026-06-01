'use client'

'use client'

import { getSupabaseBrowserClient } from './supabaseClient'
import { logoutIntentKey, sessionKey } from './localAuth'
import { withCsrfHeaders } from '@/lib/security/csrfClient'

export async function logoutUser() {
  window.localStorage.setItem(logoutIntentKey, new Date().toISOString())
  window.localStorage.removeItem(sessionKey)
  window.localStorage.removeItem('flowsys-employee-session')
  try {
    await fetch('/api/auth/session', { method: 'DELETE', headers: withCsrfHeaders() })
  } catch {
    // Client-side cleanup still protects this browser if the network is unavailable.
  }

  const supabase = getSupabaseBrowserClient()
  if (supabase) {
    try {
      await supabase.auth.signOut()
    } catch {
      // Local logout should still complete even if the auth provider is briefly unreachable.
    }
  }
}
