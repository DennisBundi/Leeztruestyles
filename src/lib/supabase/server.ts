import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if env vars are missing or are placeholders
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'placeholder' || supabaseAnonKey === 'placeholder') {
    // For development with placeholders, return a mock client that won't crash
    // This allows UI preview without database
    const mockClient = {
      from: () => ({
        select: () => ({ data: null, error: { message: 'Database not configured' } }),
        insert: () => ({ data: null, error: { message: 'Database not configured' } }),
        update: () => ({ data: null, error: { message: 'Database not configured' } }),
        delete: () => ({ data: null, error: { message: 'Database not configured' } }),
      }),
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      rpc: () => ({ data: null, error: { message: 'Database not configured' } }),
    };
    return mockClient as any;
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

