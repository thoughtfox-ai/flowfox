import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/boards'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
    }

    // Validate domain restriction
    const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN || 'thoughtfox.com'
    const userEmail = data.session?.user?.email

    if (userEmail) {
      const emailDomain = userEmail.split('@')[1]
      if (emailDomain !== allowedDomain) {
        // Sign out and redirect with error
        await supabase.auth.signOut()
        return NextResponse.redirect(
          `${origin}/auth/login?error=unauthorized_domain`
        )
      }
    }

    // Store provider tokens for Google Tasks API access (if available)
    if (data.session?.provider_token && data.session?.provider_refresh_token) {
      // TODO: Store tokens in Supabase Vault for Google Tasks sync
      console.log('Google tokens received, will store for Tasks API access')
    }

    // Create or update user profile
    // Note: This will be handled once Supabase is fully configured
    // The user profile sync happens automatically via Supabase Auth triggers
    // or can be done via database functions

    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}
