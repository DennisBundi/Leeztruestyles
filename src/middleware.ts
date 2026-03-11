
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Webhook endpoints exempt from CSRF (protected by signature verification)
const CSRF_EXEMPT_PATHS = [
  '/api/payments/paystack',
  '/api/payments/callback/mpesa',
];

function isCSRFExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  // CSRF origin validation for mutating API requests
  if (
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    request.method !== 'OPTIONS' &&
    request.nextUrl.pathname.startsWith('/api/') &&
    !isCSRFExempt(request.nextUrl.pathname)
  ) {
    const origin = request.headers.get('origin');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (origin && appUrl) {
      const allowedOrigins = new Set<string>();

      // Primary configured origin
      try {
        allowedOrigins.add(new URL(appUrl).origin);
      } catch {
        // Malformed URL config - skip CSRF check rather than crash all requests
        return await updateSession(request);
      }

      // Always allow the server's own origin (handles any domain/alias dynamically)
      allowedOrigins.add(request.nextUrl.origin);

      // Also allow the Vercel deployment URL if set
      if (process.env.VERCEL_URL) {
        allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
      }

      if (!allowedOrigins.has(origin)) {
        return NextResponse.json(
          { error: 'Forbidden: origin mismatch' },
          { status: 403 }
        );
      }
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
