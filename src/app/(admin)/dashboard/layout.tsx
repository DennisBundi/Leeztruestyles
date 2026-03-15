import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canAccessAdmin, getUserRole } from "@/lib/auth/roles";
import AdminNav from "@/components/admin/AdminNav";
import { ADMIN_EMAILS } from "@/config/admin";
import { getEmployee } from "@/lib/auth/roles";

export const dynamic = 'force-dynamic';

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
  // Never allow this in production — misconfigured env vars must not bypass auth
  const isProduction = process.env.NODE_ENV === 'production';
  if (!hasSupabase && isProduction) {
    redirect('/signin');
  }
  if (!hasSupabase) {
    return (
      <div className="min-h-screen relative">
        <div className="fixed inset-0 bg-gradient-to-br from-rose-900 via-pink-800 to-purple-900 -z-10" />
        <AdminNav />
        <div className="ml-0 lg:ml-64 transition-all duration-300 pt-16 lg:pt-0">
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
  const supabase = await createClient();

  // Try to get user with retry logic for session sync
  // Sometimes cookies need a moment to be available after sign-in
  let user = null;
  let userError: any = null;
  let sessionError: any = null;
  const maxRetries = 1;
  let retries = 0;

  while (retries <= maxRetries && !user) {
    // Try getSession first (reads cookies from request)
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (session?.user) {
      user = session.user;
      break;
    }

    // If no session, try getUser (more reliable but requires valid cookies)
    const {
      data: { user: getUserResult },
      error: getUserErr,
    } = await supabase.auth.getUser();

    if (getUserResult) {
      user = getUserResult;
      break;
    }

    // Store errors for the last attempt
    if (retries === maxRetries) {
      userError = getUserErr;
      sessionError = sessionErr;
    }

    // If this isn't the last attempt, wait a bit and retry
    if (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    retries++;
  }

  if (!user) {
    redirect('/signin');
  }

  let userRole = await getUserRole(user.id);

  // If user has no role but has an admin email, we log it but don't attempt to assign it here
  // Admin assignment should happen during signin or via API
  if (!userRole && user.email) {
    const isAdminEmail = ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (isAdminEmail && process.env.NODE_ENV === 'development') {
      console.log("[dashboard] Admin email detected but no role found. Admin assignment should have happened during signin.");
    }
  }


  if (!canAccessAdmin(userRole)) {
    redirect('/');
  }

  // Get employee info to pass to AdminNav
  const employee = await getEmployee(user.id);

  return (
    <div className="min-h-screen relative">
      {/* Fixed gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-rose-900 via-pink-800 to-purple-900 -z-10" />
      <AdminNav userRole={userRole} employee={employee} />
      <div className="ml-0 lg:ml-64 transition-all duration-300">
        <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
