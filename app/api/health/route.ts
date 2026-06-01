export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const emailProvider = process.env.RESEND_API_KEY
    ? 'resend'
    : process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
      ? 'brevo'
      : process.env.SENDGRID_API_KEY
        ? 'sendgrid'
        : 'not-configured'
  const paymentProvider = process.env.STRIPE_SECRET_KEY
    ? 'stripe'
    : process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
      ? 'paypal'
      : 'manual-billing'

  return Response.json({
    ok: true,
    product: 'WiseFlow',
    checkedAt: new Date().toISOString(),
    services: {
      app: 'ok',
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      authSecretConfigured: Boolean(process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_JWT_SECRET),
      emailProvider,
      paymentProvider,
      uploadStorage: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase-storage' : 'local-private-fallback',
    },
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
