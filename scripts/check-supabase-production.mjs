import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'

for (const file of ['.env.production.local', '.env.local', '.env']) {
  if (!existsSync(file)) continue
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...valueParts] = trimmed.split('=')
    if (!key || process.env[key]) continue
    process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '')
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  const missing = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean)
  console.error(`Missing production Supabase env var${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`)
  console.error('Set these in the deployment environment or .env.production.local before running npm run check:supabase.')
  console.error('Keep SUPABASE_SERVICE_ROLE_KEY server-only; never expose it with a NEXT_PUBLIC_ prefix.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data, error } = await supabase.rpc('verify_wiseflow_production_setup')

if (error) {
  console.error(`Supabase verification RPC failed: ${error.message}`)
  console.error('Run scripts/supabase-production-verify.sql after the table setup scripts, then retry.')
  process.exit(1)
}

const checks = Array.isArray(data) ? data : []
const failed = checks.filter(item => !item.passed)

for (const item of checks) {
  console.log(`${item.passed ? 'PASS' : 'FAIL'} ${item.check_name}: ${item.detail}`)
}

if (failed.length) {
  process.exit(1)
}
