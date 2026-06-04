import { NextResponse, type NextRequest } from 'next/server'
import { areaForPath, canAccessArea, canAccessBanking, homeForRole, isBankingPath } from './lib/security/rbac'
import { authCookieName, openSession } from './lib/security/session'

const publicPaths = new Set([
  '/',
  '/why-wiseflow',
  '/platform-solutions',
  '/industries',
  '/resource-center',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/security',
  '/login',
  '/account-recovery',
  '/signup',
  '/employee/login',
])

function isPublicPath(pathname: string) {
  return publicPaths.has(pathname)
    || pathname.startsWith('/rfq-response')
    || pathname.startsWith('/_next/')
    || pathname.startsWith('/favicon')
    || pathname.startsWith('/sounds/')
    || pathname.startsWith('/window.svg')
    || pathname.startsWith('/next.svg')
    || pathname.startsWith('/vercel.svg')
    || pathname.startsWith('/globe.svg')
    || pathname.startsWith('/file.svg')
}

function sessionToken(request: NextRequest) {
  if (request.nextUrl.hostname === '127.0.0.1' || request.nextUrl.hostname === 'localhost') {
    const qaSession = request.headers.get('x-wiseflow-qa-session')?.trim()
    if (qaSession) return qaSession
  }
  return request.cookies.get(authCookieName)?.value
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/' && isRecoveryRedirect(request.nextUrl)) {
    const recoveryUrl = new URL('/account-recovery', request.url)
    recoveryUrl.search = request.nextUrl.search
    return NextResponse.redirect(recoveryUrl)
  }
  if (isPublicPath(pathname)) return NextResponse.next()
  if (pathname.startsWith('/api/accounting/banking')) {
    const session = await openSession(sessionToken(request))
    if (!session) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
    if (!canAccessBanking(session.role)) return NextResponse.json({ ok: false, error: 'Access denied.' }, { status: 403 })
    return NextResponse.next()
  }
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const session = await openSession(sessionToken(request))
  if (!session) {
    const loginUrl = new URL(pathname.startsWith('/employee') ? '/employee/login' : '/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isBankingPath(pathname) && !canAccessBanking(session.role)) {
    return new NextResponse(
      '<!doctype html><html><head><title>Access Denied</title><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f8fafc;color:#0f172a;display:grid;min-height:100vh;place-items:center"><main style="width:min(460px,calc(100% - 32px));background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.08)"><h1 style="margin:0 0 10px;font-size:24px">Access Denied</h1><p style="margin:0;color:#475569;line-height:1.6">Banking is restricted to Admin and Finance users.</p></main></body></html>',
      { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const area = areaForPath(pathname)
  if (!canAccessArea(session.role, area)) {
    return NextResponse.redirect(new URL(homeForRole(session.role), request.url))
  }

  return NextResponse.next()
}

function isRecoveryRedirect(url: NextRequest['nextUrl']) {
  return url.searchParams.get('type') === 'recovery'
    || url.searchParams.has('code')
    || url.searchParams.has('token_hash')
    || url.searchParams.has('error_code')
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
