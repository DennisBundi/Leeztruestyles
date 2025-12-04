import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if env vars are missing or are placeholders
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === "placeholder" ||
    supabaseAnonKey === "placeholder" ||
    supabaseUrl.trim() === "" ||
    supabaseAnonKey.trim() === ""
  ) {
    // Return a dummy client that won't crash but won't perform operations
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signUp: async () => ({
          data: { user: null, session: null },
          error: {
            message:
              "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.",
          },
        }),
        signInWithPassword: async () => ({
          data: { user: null, session: null },
          error: {
            message:
              "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.",
          },
        }),
      },
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({ data: [], error: null }),
            single: () => ({ data: null, error: null }),
          }),
          eq: () => ({
            single: () => ({ data: null, error: null }),
            limit: () => ({ data: [], error: null }),
          }),
          in: () => ({ data: [], error: null }),
        }),
      }),
    } as any;
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch {
    // Invalid URL, return dummy client
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signUp: async () => ({
          data: { user: null, session: null },
          error: {
            message:
              "Invalid Supabase URL format. Please check NEXT_PUBLIC_SUPABASE_URL in your .env.local file.",
          },
        }),
        signInWithPassword: async () => ({
          data: { user: null, session: null },
          error: {
            message:
              "Invalid Supabase URL format. Please check NEXT_PUBLIC_SUPABASE_URL in your .env.local file.",
          },
        }),
      },
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({ data: [], error: null }),
            single: () => ({ data: null, error: null }),
          }),
          eq: () => ({
            single: () => ({ data: null, error: null }),
            limit: () => ({ data: [], error: null }),
          }),
          in: () => ({ data: [], error: null }),
        }),
      }),
    } as any;
  }

  // createBrowserClient automatically handles cookies in the browser
  // No explicit configuration needed - it uses browser's cookie storage
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
