import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if Supabase is configured
  const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder' &&
                      process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '';

  if (!hasSupabase) {
    // Just pass through without any Supabase operations
    return NextResponse.next();
  }

  // Update session to refresh auth cookies
  // This is critical for server-side auth checks to work
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

