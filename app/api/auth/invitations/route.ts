import { createClient } from '@supabase/supabase-js'

type InvitePayload = {
  email?: unknown
  role?: unknown
  invitedBy?: unknown
}

const allowedRoles = new Set(['Admin', 'HR', 'Finance', 'Project Manager', 'Support', 'Client', 'Member'])

function value(input: unknown) {
  return typeof input === 'string' ? input.trim() : ''
}

function isEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
}

function appOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (configured) return configured.startsWith('http') ? configured : `https://${configured}`

  const origin = request.headers.get('origin')
  if (origin) return origin

  const host = request.headers.get('host')
  return host ? `https://${host}` : ''
}

export async function POST(request: Request) {
  let payload: InvitePayload

  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const email = value(payload.email).toLowerCase()
  const role = value(payload.role) || 'Member'
  const invitedBy = value(payload.invitedBy) || 'HR HUB Admin'

  if (!isEmail(email)) {
    return Response.json({ ok: false, error: 'Enter a valid invitation email.' }, { status: 400 })
  }

  if (!allowedRoles.has(role)) {
    return Response.json({ ok: false, error: 'Choose a valid role for this invitation.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({
      ok: false,
      error: 'Supabase invitation email is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.',
    }, { status: 200 })
  }

  const origin = appOrigin(request)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/login`,
    data: {
      role,
      invitedBy,
      invitedAt: new Date().toISOString(),
    },
  })

  if (error) {
    return Response.json({ ok: false, error: error.message || 'Supabase could not send the invitation email.' }, { status: 200 })
  }

  return Response.json({ ok: true })
}
