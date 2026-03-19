import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  // Step 1: Supabase session refresh — set cookies on request so they carry through
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        },
      },
    }
  )

  // Refresh session (AUTH-04: session persistence)
  await supabase.auth.getUser()

  // Step 2: next-intl routing
  const response = intlMiddleware(request)

  // Step 3: Copy any updated Supabase auth cookies to the response
  // Without this, session cookies from getUser() refresh are lost
  const supabaseCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
  for (const cookie of supabaseCookies) {
    response.cookies.set(cookie.name, cookie.value, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return response
}

export const config = {
  // Match all pathnames except for
  // - api routes
  // - _next (Next.js internals)
  // - _vercel (Vercel internals)
  // - files with extensions (e.g. .png, .css)
  matcher: ['/', '/(nl|pap|es)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
}
