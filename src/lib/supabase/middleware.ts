import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip Supabase operations if not configured or using placeholders
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === "placeholder" ||
    supabaseAnonKey === "placeholder"
  ) {
    // Return early without trying to use Supabase
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Create new response for each cookie update
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set all cookies on the response
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: "lax" as const,
              path: "/",
            });
          });
        },
      },
    });

    // Refresh the session - this will update cookies if needed
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    // If no user, try to get session (this will also refresh cookies)
    if (!user) {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      // Log for debugging (only in development)
      if (process.env.NODE_ENV === "development" && !session && !getUserError) {
        console.log(
          "⚠️ [middleware] No session found, but no error. Cookies may not be set yet."
        );
      }
    } else {
      // User found, ensure session is refreshed
      await supabase.auth.getSession();
    }
  } catch (error) {
    // If Supabase fails, just continue without it
    console.warn("Supabase middleware error (non-critical):", error);
  }

  return supabaseResponse;
}
