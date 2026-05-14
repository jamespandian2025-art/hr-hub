'use client'

import { getSupabaseBrowserClient } from './supabaseClient'
import { logoutIntentKey, sessionKey } from './localAuth'

export async function logoutUser() {
  window.localStorage.setItem(logoutIntentKey, new Date().toISOString())
  window.localStorage.removeItem(sessionKey)
  window.localStorage.removeItem('flowsys-employee-session')

  const supabase = getSupabaseBrowserClient()
  if (supabase) {
    try {
      await supabase.auth.signOut()
    } catch {
      // Local logout should still complete even if the auth provider is briefly unreachable.
    }
  }
}
