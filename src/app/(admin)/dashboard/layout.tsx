import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canAccessAdmin, getUserRole } from "@/lib/auth/roles";
import AdminNav from "@/components/admin/AdminNav";
import { cookies } from "next/headers";
import { ADMIN_EMAILS } from "@/config/admin";
import { getEmployee } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if Supabase is configured
  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "placeholder";

  // In preview mode (no Supabase), show admin dashboard with dummy data
  if (!hasSupabase) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <div className="lg:ml-64 transition-all duration-300 min-h-[calc(100vh-4rem)]">
          <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
            {/* Preview Mode Banner */}
            <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Preview Mode
                  </p>
                  <p className="text-xs text-blue-700">
                    Showing dummy data. Configure Supabase to access real data.
                  </p>
                </div>
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    );
  }

  // When Supabase is configured, check authentication
  // Debug: Check available cookies FIRST, before creating Supabase client
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log("🍪 [dashboard] Available cookies:", {
      count: allCookies.length,
      names: allCookies.map((c) => c.name),
      hasSupabaseCookies: allCookies.some(
        (c) => c.name.includes("supabase") || c.name.includes("sb-")
      ),
      cookieDetails: allCookies.map((c) => ({
        name: c.name,
        value: c.value ? `${c.value.substring(0, 20)}...` : "empty",
      })),
    });
  } catch (cookieError: any) {
    console.error(
      "❌ [dashboard] Error reading cookies:",
      cookieError?.message || cookieError
    );
  }

  const supabase = await createClient();

  // Try to get user with retry logic for session sync
  // Sometimes cookies need a moment to be available after sign-in
  let user = null;
  let userError: any = null;
  let sessionError: any = null;
  const maxRetries = 2;
  let retries = 0;

  while (retries <= maxRetries && !user) {
    // Try getSession first (reads cookies from request)
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (session?.user) {
      user = session.user;
      console.log("✅ [dashboard] User found via getSession:", {
        userId: user.id,
        userEmail: user.email,
        attempt: retries + 1,
      });
      break;
    }

    // Log session error details for debugging
    if (sessionErr && retries === maxRetries) {
      console.log("🔍 [dashboard] getSession error details:", {
        message: sessionErr.message,
        status: sessionErr.status,
        name: sessionErr.name,
      });
    }

    // If no session, try getUser (more reliable but requires valid cookies)
    const {
      data: { user: getUserResult },
      error: getUserErr,
    } = await supabase.auth.getUser();

    if (getUserResult) {
      user = getUserResult;
      console.log("✅ [dashboard] User found via getUser:", {
        userId: user.id,
        userEmail: user.email,
        attempt: retries + 1,
      });
      break;
    }

    // Log getUser error details for debugging
    if (getUserErr && retries === maxRetries) {
      console.log("🔍 [dashboard] getUser error details:", {
        message: getUserErr.message,
        status: getUserErr.status,
        name: getUserErr.name,
      });
    }

    // Store errors for the last attempt
    if (retries === maxRetries) {
      userError = getUserErr;
      sessionError = sessionErr;
    }

    // If this isn't the last attempt, wait a bit and retry
    if (retries < maxRetries) {
      console.log(
        `🔄 [dashboard] No user found, retrying... (${retries + 1
        }/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    retries++;
  }

  // Log final result
  if (!user) {
    // Check for cookie project mismatch
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      (c) => c.name.includes("supabase") || c.name.includes("sb-")
    );

    const expectedProjectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https?:\/\/([^.]+)\.supabase\.co/
    )?.[1];

    const cookieProjectIds = supabaseCookies.map((c) => {
      const match = c.name.match(/sb-([^-]+)-/);
      return match ? match[1] : null;
    });

    const hasMismatch = cookieProjectIds.some(
      (id) => id && id !== expectedProjectId
    );

    console.log("❌ [dashboard] No user found after retries:", {
      userError: userError?.message,
      sessionError: sessionError?.message,
      expectedProjectId,
      cookieProjectIds,
      hasMismatch,
      cookieNames: supabaseCookies.map((c) => c.name),
      allCookieNames: allCookies.map((c) => c.name),
    });

    if (hasMismatch) {
      console.error(
        "🚨 [dashboard] COOKIE PROJECT MISMATCH DETECTED!",
        "\n  Expected project:",
        expectedProjectId,
        "\n  Cookie projects:",
        cookieProjectIds.filter(Boolean),
        "\n  Please clear all cookies and sign in again."
      );
    }
  }

  if (!user) {
    // Check for cookie project mismatch to show helpful message
    let cookieMismatchMessage = null;
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      const supabaseCookies = allCookies.filter(
        (c) => c.name.includes("supabase") || c.name.includes("sb-")
      );

      const expectedProjectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
        /https?:\/\/([^.]+)\.supabase\.co/
      )?.[1];

      const cookieProjectIds = supabaseCookies
        .map((c) => {
          const match = c.name.match(/sb-([^-]+)-/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      const hasMismatch = cookieProjectIds.some(
        (id) => id && id !== expectedProjectId
      );

      if (hasMismatch) {
        cookieMismatchMessage = `Old cookies detected from different Supabase project. Please clear all cookies and sign in again.`;
      }
    } catch (e) {
      // Ignore errors in cookie checking
    }

    // Show helpful error message
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-2">
            Please sign in to access the admin dashboard.
          </p>
          {cookieMismatchMessage && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-semibold mb-1">
                Cookie Mismatch Detected
              </p>
              <p className="text-xs text-yellow-700">{cookieMismatchMessage}</p>
              <p className="text-xs text-yellow-600 mt-2">
                <strong>How to fix:</strong> Open DevTools (F12) → Application →
                Cookies → Delete all cookies starting with "sb-"
              </p>
            </div>
          )}
          {(sessionError || userError) && !cookieMismatchMessage && (
            <p className="text-xs text-gray-400 mb-4">
              {sessionError
                ? `Error: ${sessionError.message}`
                : userError
                  ? `Error: ${userError.message}`
                  : "Auth session missing!"}
            </p>
          )}
          <div className="space-y-3">
            <a
              href="/signin?redirect=/dashboard"
              className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              Go to Sign In
            </a>
            <div>
              <a
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700 underline block"
              >
                Refresh Page
              </a>
            </div>
          </div>
          {!cookieMismatchMessage && (
            <p className="text-xs text-gray-400 mt-4">
              If you just signed in, the session may not have synced yet. Try
              refreshing or signing in again.
            </p>
          )}
        </div>
      </div>
    );
  }

  let userRole = await getUserRole(user.id);

  // If user has no role but has an admin email, we log it but don't attempt to assign it here
  // Admin assignment should happen during signin or via API
  if (!userRole && user.email) {
    const isAdminEmail = ADMIN_EMAILS.includes(user.email.toLowerCase());

    if (isAdminEmail) {
      console.log(
        "🔐 [dashboard] Admin email detected but no role found. Admin assignment should have happened during signin."
      );
    }
  }


  if (!canAccessAdmin(userRole)) {
    redirect('/');
  }

  // Get employee info to pass to AdminNav
  const employee = await getEmployee(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav userRole={userRole} employee={employee} />
      <div className="lg:ml-64 transition-all duration-300 min-h-[calc(100vh-4rem)]">
        <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
