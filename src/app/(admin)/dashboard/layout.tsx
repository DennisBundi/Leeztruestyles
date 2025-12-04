import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canAccessAdmin, getUserRole } from "@/lib/auth/roles";
import AdminNav from "@/components/admin/AdminNav";
import { cookies } from "next/headers";

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

  // Try getUser first (more reliable for server-side)
  const {
    data: { user: getUserResult },
    error: userError,
  } = await supabase.auth.getUser();
  let user = getUserResult ?? null;

  console.log("👤 [dashboard] getUser result:", {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    error: userError?.message,
  });

  // If getUser fails, try getSession as fallback
  let sessionError: any = null;
  if (!user) {
    console.log("🔄 [dashboard] getUser failed, trying getSession...");
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();
    sessionError = sessionErr;
    user = session?.user ?? null;

    console.log("📋 [dashboard] getSession result:", {
      hasSession: !!session,
      hasUser: !!user,
      userId: user?.id,
      error: sessionErr?.message,
    });
  }

  if (!user) {
    // Show helpful error message
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-2">
            Please sign in to access the admin dashboard.
          </p>
          {(sessionError || userError) && (
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
              href="/signin"
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
          <p className="text-xs text-gray-400 mt-4">
            If you just signed in, the session may not have synced yet. Try
            refreshing or signing in again.
          </p>
        </div>
      </div>
    );
  }

  let userRole = await getUserRole(user.id);

  // If user has no role but has an admin email, try to assign admin role
  if (!userRole && user.email) {
    const adminEmails = ["leeztruestyles44@gmail.com"];
    const isAdminEmail = adminEmails.includes(user.email.toLowerCase());

    if (isAdminEmail) {
      console.log(
        "🔐 [dashboard] Admin email detected but no role found, attempting to assign..."
      );
      try {
        // Try to create employee record directly (server-side)
        const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .insert({
            user_id: user.id,
            role: "admin",
            employee_code: employeeCode,
          })
          .select()
          .single();

        if (!employeeError && employee) {
          console.log("✅ [dashboard] Admin role assigned successfully");
          userRole = "admin";
        } else {
          console.warn(
            "⚠️ [dashboard] Failed to assign admin role:",
            employeeError?.message
          );
          // Check if role was created by another process
          userRole = await getUserRole(user.id);
        }
      } catch (err: any) {
        console.warn(
          "⚠️ [dashboard] Error assigning admin role:",
          err?.message
        );
        // Check if role exists now
        userRole = await getUserRole(user.id);
      }
    }
  }

  if (!canAccessAdmin(userRole)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-2">
            You don't have admin access. Your current role:{" "}
            <strong>{userRole || "None"}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">User ID: {user.id}</p>
          {user.email && (
            <p className="text-gray-500 text-sm mb-6">Email: {user.email}</p>
          )}
          <div className="space-y-2">
            <a
              href="/"
              className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              Go to Home
            </a>
            <p className="text-xs text-gray-400 mt-4">
              If you believe you should have admin access, please contact
              support or check your employee record in Supabase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="lg:ml-64 transition-all duration-300 min-h-[calc(100vh-4rem)]">
        <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
