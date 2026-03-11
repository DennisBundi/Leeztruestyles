
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if Supabase env vars are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Try getSession first (reads from cookies), then getUser
  // This is more reliable for freshly logged-in users
  let user = null;
  let session = null;

  try {
    const {
      data: { session: sessionData },
    } = await supabase.auth.getSession()
    session = sessionData;
    user = session?.user || null;
  } catch (error: any) {
    // Handle expected errors (expired/invalid refresh tokens)
    // This is normal when sessions expire - silently continue
    if (error?.code === 'refresh_token_not_found' || error?.code === 'invalid_refresh_token') {
      // Expected error - session expired, continue without user
      if (process.env.NODE_ENV === 'development') {
        // Only log in development to reduce noise
        console.debug('[Middleware] Session expired or invalid refresh token - continuing without user');
      }
    } else {
      // Unexpected error - log it
      console.error('[Middleware] Unexpected auth error:', error);
    }
  }

  // If no user from session, try getUser as fallback
  if (!user) {
    try {
      const {
        data: { user: userFromGetUser },
      } = await supabase.auth.getUser()
      user = userFromGetUser;
    } catch (error: any) {
      // Handle expected errors (expired/invalid refresh tokens)
      if (error?.code === 'refresh_token_not_found' || error?.code === 'invalid_refresh_token') {
        // Expected error - session expired, continue without user
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Middleware] getUser failed - session expired');
        }
      } else {
        // Unexpected error - log it
        console.error('[Middleware] Unexpected getUser error:', error);
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/signin') ||
      request.nextUrl.pathname.startsWith('/signup'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/signin') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin'))
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
