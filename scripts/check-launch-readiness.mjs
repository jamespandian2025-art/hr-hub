import { existsSync, readFileSync } from 'node:fs'

const envFiles = ['.env.production.local', '.env.local', '.env']
const loadedEnvFiles = []

for (const file of envFiles) {
  if (!existsSync(file)) continue
  loadedEnvFiles.push(file)
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...valueParts] = trimmed.split('=')
    if (!key || process.env[key]) continue
    process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '')
  }
}

const results = []

function record(level, message) {
  results.push({ level, message })
}

function value(key) {
  return (process.env[key] || '').trim()
}

function isPlaceholder(input) {
  return !input
    || /your-|replace-|example\.com|your-domain|your-project|placeholder|changeme/i.test(input)
}

function checkRequired(key, label = key) {
  const current = value(key)
  if (isPlaceholder(current)) {
    record('FAIL', `${label} is missing or still a placeholder.`)
    return ''
  }
  record('PASS', `${label} is configured.`)
  return current
}

console.log('WiseFlow launch readiness check')
console.log(`Loaded env files: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : 'none; using process environment only'}`)
console.log('')

const supabaseUrl = checkRequired('NEXT_PUBLIC_SUPABASE_URL', 'Supabase project URL')
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  record('FAIL', 'Supabase project URL must start with https://.')
}

checkRequired('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase anon/publishable key')
checkRequired('SUPABASE_SERVICE_ROLE_KEY', 'Supabase service-role key')

if (value('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')) {
  record('FAIL', 'A service-role key is exposed with NEXT_PUBLIC_. Remove it immediately.')
}

if (value('NEXT_PUBLIC_ENABLE_SUPABASE_AUTH') !== 'true') {
  record('FAIL', 'NEXT_PUBLIC_ENABLE_SUPABASE_AUTH must be true for production.')
} else {
  record('PASS', 'Production Supabase auth is enabled.')
}

const appUrl = checkRequired('NEXT_PUBLIC_APP_URL', 'Production app URL')
if (appUrl && (!appUrl.startsWith('https://') || /localhost|127\.0\.0\.1/i.test(appUrl))) {
  record('FAIL', 'Production app URL must be a real https:// domain, not localhost.')
}

const authSecret = checkRequired('AUTH_SESSION_SECRET', 'Auth session secret')
if (authSecret && authSecret.length < 32) {
  record('FAIL', 'AUTH_SESSION_SECRET should be at least 32 characters.')
}

const legalName = checkRequired('NEXT_PUBLIC_LEGAL_NAME', 'Legal/business name')
const supportEmail = checkRequired('NEXT_PUBLIC_SUPPORT_EMAIL', 'Support email')
if (supportEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(supportEmail)) {
  record('FAIL', 'Support email is not a valid email address.')
}

const genericEmailDomain = supportEmail.split('@')[1]?.toLowerCase()
if (genericEmailDomain && ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(genericEmailDomain)) {
  record('WARN', `Support email uses ${genericEmailDomain}. A branded domain email is better for launch.`)
}

checkRequired('WISEFLOW_UPLOAD_BUCKET', 'Private upload bucket name')

const emailProviderKeys = [
  value('RESEND_API_KEY') && 'Resend',
  (value('BREVO_API_KEY') || value('SENDINBLUE_API_KEY')) && 'Brevo',
  value('SENDGRID_API_KEY') && 'SendGrid',
].filter(Boolean)
const fromEmail = value('RESEND_FROM_EMAIL') || value('BREVO_FROM_EMAIL') || value('SENDGRID_FROM_EMAIL') || value('EMAIL_FROM')

if (!fromEmail || isPlaceholder(fromEmail)) {
  record('FAIL', 'Email sender is missing or still a placeholder.')
} else {
  record('PASS', `Email sender is configured: ${fromEmail}.`)
}

if (emailProviderKeys.length === 0) {
  record('FAIL', 'No email provider API key is configured. Choose Resend, Brevo, or SendGrid.')
} else if (emailProviderKeys.length > 1) {
  record('FAIL', `Multiple email providers are configured (${emailProviderKeys.join(', ')}). Use exactly one.`)
} else {
  record('PASS', `${emailProviderKeys[0]} email provider key is configured.`)
}

const legalFiles = [
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
  'app/refund-policy/page.tsx',
  'app/security/page.tsx',
]
for (const file of legalFiles) {
  record(existsSync(file) ? 'PASS' : 'FAIL', `${file} ${existsSync(file) ? 'exists' : 'is missing'}.`)
}

const billingMode = value('NEXT_PUBLIC_BILLING_MODE') || 'manual'
const paymentProviders = [
  value('STRIPE_SECRET_KEY') && 'Stripe',
  (value('PAYPAL_CLIENT_ID') && value('PAYPAL_CLIENT_SECRET')) && 'PayPal',
].filter(Boolean)

if (paymentProviders.length) {
  record('PASS', `Online payment provider configured: ${paymentProviders.join(', ')}.`)
} else if (billingMode === 'manual') {
  record('WARN', 'Online payment checkout is not configured. Closed beta/manual billing only.')
} else {
  record('FAIL', 'Billing mode is not manual, but no online payment provider is configured.')
}

if (legalName && supportEmail && appUrl) {
  record('PASS', 'Public legal pages can render business name, support email, and production URL.')
}

console.log(results.map(item => `${item.level} ${item.message}`).join('\n'))
console.log('')

const totals = results.reduce((acc, item) => {
  acc[item.level] = (acc[item.level] || 0) + 1
  return acc
}, {})

console.log(`Summary: ${totals.PASS || 0} pass, ${totals.WARN || 0} warning, ${totals.FAIL || 0} fail.`)

if (totals.FAIL) {
  console.error('Status: not ready for production services yet.')
  process.exit(1)
}

console.log(totals.WARN ? 'Status: closed beta only; review warnings before wider launch.' : 'Status: ready for production service checks.')
