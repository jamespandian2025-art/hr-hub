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

function configuredFromEmail() {
  return process.env.RESEND_FROM_EMAIL
    || process.env.BREVO_FROM_EMAIL
    || process.env.SENDGRID_FROM_EMAIL
    || process.env.EMAIL_FROM
    || ''
}

async function sendWithResend(input: { fromEmail: string; recipient: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.fromEmail,
      to: [input.recipient],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  })
}

async function sendWithBrevo(input: { fromEmail: string; recipient: string; employeeName: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
  if (!apiKey) return null
  return fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: input.fromEmail, name: 'WiseFlow HR' },
      to: [{ email: input.recipient, name: input.employeeName }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  })
}

async function sendWithSendGrid(input: { fromEmail: string; recipient: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return null
  return fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.recipient }] }],
      from: { email: input.fromEmail, name: 'WiseFlow HR' },
      subject: input.subject,
      content: [
        { type: 'text/plain', value: input.text },
        { type: 'text/html', value: input.html },
      ],
    }),
  })
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

  const fromEmail = configuredFromEmail()

  if (!fromEmail) {
    return Response.json({
      ok: false,
      configurationRequired: true,
      error: 'Email sender is not configured on the server. Add RESEND_FROM_EMAIL, BREVO_FROM_EMAIL, SENDGRID_FROM_EMAIL, or EMAIL_FROM in Vercel.',
    }, { status: 503 })
  }

  if (!process.env.RESEND_API_KEY && !process.env.BREVO_API_KEY && !process.env.SENDINBLUE_API_KEY && !process.env.SENDGRID_API_KEY) {
    return Response.json({
      ok: false,
      configurationRequired: true,
      error: 'Email provider API key is not configured on the server. Add RESEND_API_KEY, BREVO_API_KEY, or SENDGRID_API_KEY in Vercel.',
    }, { status: 503 })
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

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin:0 0 12px;">WiseFlow employee portal login</h2>
      <p>Hello ${employeeName},</p>
      <p>Your WiseFlow Employee Self-Service portal account is ready.</p>
      <div style="border:1px solid #e2e8f0; border-radius:10px; padding:14px; background:#f8fafc;">
        <p><strong>Login page:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p><strong>Login email:</strong> ${portalEmail}</p>
        <p><strong>Temporary password:</strong> ${portalPassword}</p>
      </div>
      <p>Please sign in and change your temporary password after your first login.</p>
      <p>Thank you,<br />WiseFlow HR</p>
    </div>
  `

  const input = { fromEmail, recipient, employeeName, subject, text, html }
  const response = await sendWithResend(input)
    || await sendWithBrevo(input)
    || await sendWithSendGrid(input)

  if (!response) {
    return Response.json({
      ok: false,
      configurationRequired: true,
      error: 'No supported email provider is configured.',
    }, { status: 503 })
  }

  if (!response.ok) {
    const providerError = await response.text().catch(() => '')
    return Response.json({
      ok: false,
      error: providerError ? `Email provider rejected the request: ${providerError.slice(0, 280)}` : 'Email provider rejected the request.',
    }, { status: 502 })
  }

  return Response.json({ ok: true, provider: process.env.RESEND_API_KEY ? 'resend' : process.env.SENDGRID_API_KEY ? 'sendgrid' : 'brevo' })
}
