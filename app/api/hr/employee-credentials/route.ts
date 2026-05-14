type CredentialEmailPayload = {
  recipient?: unknown
  employeeName?: unknown
  portalEmail?: unknown
  portalPassword?: unknown
  loginUrl?: unknown
}

function value(input: unknown) {
  return typeof input === 'string' ? input.trim() : ''
}

function isEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
}

export async function POST(request: Request) {
  let payload: CredentialEmailPayload

  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const recipient = value(payload.recipient)
  const employeeName = value(payload.employeeName) || 'Employee'
  const portalEmail = value(payload.portalEmail)
  const portalPassword = value(payload.portalPassword)
  const loginUrl = value(payload.loginUrl)

  if (!isEmail(recipient) || !portalEmail || !portalPassword || !loginUrl) {
    return Response.json({ ok: false, error: 'Missing employee login email details.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    return Response.json({
      ok: false,
      fallback: 'mailto',
      error: 'Email provider is not configured.',
    }, { status: 200 })
  }

  const subject = 'WiseFlow employee portal login details'
  const text = [
    `Hello ${employeeName},`,
    '',
    'Your WiseFlow Employee Self-Service portal account is ready.',
    '',
    `Login page: ${loginUrl}`,
    `Login email: ${portalEmail}`,
    `Temporary password: ${portalPassword}`,
    '',
    'Please sign in and change your temporary password after your first login.',
    '',
    'Thank you,',
    'WiseFlow HR',
  ].join('\n')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject,
      text,
    }),
  })

  if (!response.ok) {
    return Response.json({
      ok: false,
      fallback: 'mailto',
      error: 'Email provider rejected the request.',
    }, { status: 200 })
  }

  return Response.json({ ok: true })
}
