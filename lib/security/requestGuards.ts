const csrfHeaderName = 'x-wiseflow-csrf'
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

function configuredOrigins(request: Request) {
  const origins = new Set<string>()
  const configured = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ].filter(Boolean) as string[]

  configured.forEach(value => {
    const withProtocol = value.startsWith('http') ? value : `https://${value}`
    try {
      origins.add(new URL(withProtocol).origin)
    } catch {
      // Ignore malformed deployment hints.
    }
  })

  const host = request.headers.get('host')
  if (host) {
    const forwardedProto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    origins.add(`${forwardedProto}://${host}`)
  }

  return origins
}

function requestOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (origin) return origin

  const referer = request.headers.get('referer')
  if (!referer) return ''
  try {
    return new URL(referer).origin
  } catch {
    return ''
  }
}

export function assertOrigin(request: Request) {
  if (safeMethods.has(request.method.toUpperCase())) return

  const origin = requestOrigin(request)
  if (!origin) {
    if (process.env.NODE_ENV === 'production') {
      throw Object.assign(new Error('Missing request origin.'), { status: 403 })
    }
    return
  }

  if (!configuredOrigins(request).has(origin)) {
    throw Object.assign(new Error('Request origin is not allowed.'), { status: 403 })
  }
}

export function requireCsrf(request: Request) {
  if (safeMethods.has(request.method.toUpperCase())) return

  assertOrigin(request)
  if (request.headers.get(csrfHeaderName) !== '1') {
    throw Object.assign(new Error('Missing CSRF protection header.'), { status: 403 })
  }
}
