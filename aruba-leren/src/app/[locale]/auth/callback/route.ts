import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/nl/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(new URL('/nl/login?error=auth_failed', requestUrl.origin))
    }

    // Successful authentication - redirect to dashboard
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // No code provided - redirect to login with error
  return NextResponse.redirect(new URL('/nl/login?error=no_code', requestUrl.origin))
}
