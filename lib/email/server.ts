import 'server-only'

type SupportedEmailProvider = 'resend' | 'brevo' | 'sendgrid'

export type TransactionalEmailInput = {
  recipient: string
  recipientName?: string
  subject: string
  text: string
  html: string
  fromName?: string
}

export type TransactionalEmailResult =
  | { ok: true; provider: SupportedEmailProvider }
  | { ok: false; configurationRequired?: boolean; error: string }

function configuredFromEmail() {
  return process.env.RESEND_FROM_EMAIL
    || process.env.BREVO_FROM_EMAIL
    || process.env.SENDGRID_FROM_EMAIL
    || process.env.EMAIL_FROM
    || ''
}

function hasProviderKey() {
  return Boolean(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || process.env.SENDGRID_API_KEY)
}

async function sendWithResend(input: TransactionalEmailInput & { fromEmail: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  const response = await fetch('https://api.resend.com/emails', {
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
  return { provider: 'resend' as const, response }
}

async function sendWithBrevo(input: TransactionalEmailInput & { fromEmail: string }) {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
  if (!apiKey) return null
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: input.fromEmail, name: input.fromName || 'WiseFlow' },
      to: [{ email: input.recipient, name: input.recipientName || input.recipient }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  })
  return { provider: 'brevo' as const, response }
}

async function sendWithSendGrid(input: TransactionalEmailInput & { fromEmail: string }) {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return null
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.recipient, name: input.recipientName || input.recipient }] }],
      from: { email: input.fromEmail, name: input.fromName || 'WiseFlow' },
      subject: input.subject,
      content: [
        { type: 'text/plain', value: input.text },
        { type: 'text/html', value: input.html },
      ],
    }),
  })
  return { provider: 'sendgrid' as const, response }
}

async function providerError(response: Response) {
  const body = await response.text().catch(() => '')
  return body ? `Email provider rejected the request: ${body.slice(0, 280)}` : 'Email provider rejected the request.'
}

function sendError(error: unknown) {
  return error instanceof Error ? error.message : 'Email provider request failed.'
}

export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<TransactionalEmailResult> {
  const fromEmail = configuredFromEmail()
  if (!fromEmail) {
    return {
      ok: false,
      configurationRequired: true,
      error: 'Email sender is not configured. Add EMAIL_FROM, RESEND_FROM_EMAIL, BREVO_FROM_EMAIL, or SENDGRID_FROM_EMAIL.',
    }
  }
  if (!hasProviderKey()) {
    return {
      ok: false,
      configurationRequired: true,
      error: 'Email provider API key is not configured. Add RESEND_API_KEY, BREVO_API_KEY, or SENDGRID_API_KEY.',
    }
  }

  const prepared = { ...input, fromEmail }
  const delivery = await (async () => {
    try {
      return await sendWithResend(prepared)
        || await sendWithBrevo(prepared)
        || await sendWithSendGrid(prepared)
    } catch (error) {
      return { error: sendError(error) }
    }
  })()

  if (delivery && 'error' in delivery) return { ok: false, error: delivery.error }

  if (!delivery) {
    return {
      ok: false,
      configurationRequired: true,
      error: 'No supported email provider is configured.',
    }
  }
  if (!delivery.response.ok) {
    return { ok: false, error: await providerError(delivery.response) }
  }
  return { ok: true, provider: delivery.provider }
}
