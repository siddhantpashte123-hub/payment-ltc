import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Resolve the current user defensively. Both client creation and the
  // getUser() network call run on EVERY request. If either throws (missing or
  // invalid env vars, transient network error, timeout, Supabase unreachable),
  // an uncaught throw would 500 EVERY page ("This page couldn't load"). Fail
  // open: on any error, treat the visitor as unauthenticated so public pages
  // still render and protected routes simply redirect to /login.
  let user: { id: string } | null = null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
            })
          },
        },
      }
    )

    const result = await supabase.auth.getUser()
    user = result.data?.user ?? null
  } catch (err) {
    console.error('middleware: supabase auth setup/getUser failed:', err)
    user = null
  }

  // Public routes
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isHome = request.nextUrl.pathname === '/'

  // Redirect logged-in users away from login/home
  if (user && (isLoginPage || isHome)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect dashboard and API routes
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/api'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)'],
}
