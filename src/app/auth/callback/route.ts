import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Wrap the whole Supabase session-exchange in try/catch. With a valid env
    // the real client runs; a transient network/Supabase error would otherwise
    // throw uncaught and 500 the page ("This page couldn't load"). On any
    // failure, fall through to the auth_callback_failed redirect below.
    try {
      const cookieStore = await cookies()
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        redirect(next)
      }
    } catch (err) {
      console.error('auth callback failed:', err)
    }
  }

  redirect('/login?error=auth_callback_failed')
}
