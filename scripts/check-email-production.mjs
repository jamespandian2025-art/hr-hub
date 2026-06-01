const provider = process.env.RESEND_API_KEY
  ? 'resend'
  : process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
    ? 'brevo'
    : process.env.SENDGRID_API_KEY
      ? 'sendgrid'
      : ''

const fromEmail = process.env.RESEND_FROM_EMAIL
  || process.env.BREVO_FROM_EMAIL
  || process.env.SENDGRID_FROM_EMAIL
  || process.env.EMAIL_FROM
  || ''

const recipient = process.env.EMAIL_TEST_RECIPIENT || ''
const shouldSend = process.env.EMAIL_TEST_SEND === '1'
const failures = []

if (!fromEmail) failures.push('Missing sender email. Set EMAIL_FROM, RESEND_FROM_EMAIL, BREVO_FROM_EMAIL, or SENDGRID_FROM_EMAIL in the deployment environment.')
if (!provider) failures.push('Missing email provider API key. Set exactly one provider key: RESEND_API_KEY, BREVO_API_KEY, or SENDGRID_API_KEY.')

function brandedDomain(email) {
  const match = email.match(/@([^>@\s]+)>?$/)
  return match?.[1]?.toLowerCase() || ''
}

const domain = brandedDomain(fromEmail)
if (domain && ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(domain)) {
  failures.push(`Sender domain ${domain} is not a branded/domain-authenticated sender.`)
}

async function sendTest() {
  const subject = `WiseFlow staging email verification ${new Date().toISOString()}`
  const text = 'WiseFlow staging email verification succeeded.'
  const html = '<p>WiseFlow staging email verification succeeded.</p>'

  if (provider === 'resend') {
    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [recipient], subject, text, html }),
    })
  }

  if (provider === 'brevo') {
    return fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { email: fromEmail, name: 'WiseFlow' }, to: [{ email: recipient }], subject, htmlContent: html, textContent: text }),
    })
  }

  return fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipient }] }],
      from: { email: fromEmail, name: 'WiseFlow' },
      subject,
      content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
    }),
  })
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`))
  console.error('No test email was sent. Configure the missing env vars, then rerun npm run check:email.')
  process.exit(1)
}

console.log(`PASS email provider configured: ${provider}`)
console.log(`PASS sender configured: ${fromEmail}`)

if (!shouldSend) {
  console.log('PASS dry run only. Set EMAIL_TEST_SEND=1 and EMAIL_TEST_RECIPIENT to send a staging verification email.')
  process.exit(0)
}

if (!recipient) {
  console.error('FAIL EMAIL_TEST_RECIPIENT is required when EMAIL_TEST_SEND=1.')
  process.exit(1)
}

const response = await sendTest()
if (!response.ok) {
  const body = await response.text().catch(() => '')
  console.error(`FAIL provider rejected staging email: ${response.status} ${body.slice(0, 400)}`)
  process.exit(1)
}

console.log(`PASS staging verification email accepted by ${provider} for ${recipient}`)
