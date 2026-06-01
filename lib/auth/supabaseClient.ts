'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseAuthEnabled = process.env.NODE_ENV === 'production'
  || process.env.NEXT_PUBLIC_ENABLE_SUPABASE_AUTH === 'true'

export function hasSupabaseConfig() {
  return supabaseAuthEnabled && Boolean(supabaseUrl && supabaseAnonKey)
}

export function getSupabaseBrowserClient(options: { persistSession?: boolean } = {}) {
  if (!supabaseAuthEnabled || !supabaseUrl || !supabaseAnonKey) return null
  const persistSession = options.persistSession ?? true
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: persistSession,
      detectSessionInUrl: true,
      persistSession,
    },
  })
}
