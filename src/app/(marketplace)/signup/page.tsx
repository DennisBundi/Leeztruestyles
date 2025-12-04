"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Check if Supabase is properly configured (only on client side)
      if (typeof window !== "undefined") {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (
          !supabaseUrl ||
          !supabaseKey ||
          supabaseUrl === "placeholder" ||
          supabaseKey === "placeholder" ||
          supabaseUrl.trim() === "" ||
          supabaseKey.trim() === ""
        ) {
          setError(
            "Supabase is not configured. Please check your .env.local file has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set."
          );
          setLoading(false);
          return;
        }
      }

      console.log("Attempting to sign up user:", formData.email);

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          email_redirect_to:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });

      console.log("Sign up response:", {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        error: signUpError,
      });

      if (signUpError) {
        console.error("Sign up error details:", signUpError);
        setError(
          `Failed to create account: ${signUpError.message}. Please check your Supabase configuration.`
        );
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // User created but needs email confirmation
        // Still create the profile and assign admin role (if applicable) for when they confirm
        console.log(
          "User created but email confirmation required. User ID:",
          data.user.id
        );

        // Try to create profile even without session (might work if RLS allows)
        try {
          await supabase.from("users").insert({
            id: data.user.id,
            email: formData.email,
            full_name: formData.fullName,
          });
        } catch (profileErr) {
          console.log(
            "Profile creation will happen on email confirmation via trigger"
          );
        }

        setNeedsEmailConfirmation(true);
        setSuccess(true);
        setTimeout(() => {
          router.push("/signin");
          router.refresh();
        }, 3000);
        return;
      }

      if (!data || !data.user) {
        console.error("No user data returned from signup");
        setError(
          "Account creation failed - no user data returned. Please check your Supabase configuration and try again."
        );
        setLoading(false);
        return;
      }

      console.log("User created successfully:", data.user.id);

      // Create user profile (if trigger doesn't handle it)
      // The trigger should auto-create it, but we'll try manually as backup
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        email: formData.email,
        full_name: formData.fullName,
      });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Check if profile was created by trigger (might already exist)
        const { data: existingProfile } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .single();

        if (!existingProfile) {
          // Profile doesn't exist and creation failed
          setError(
            `Account created but profile setup failed: ${profileError.message}. Please contact support or try signing in - the profile may be created automatically.`
          );
          setLoading(false);
          return;
        }
        // Profile exists (created by trigger), continue
        console.log("Profile already exists (created by trigger)");
      }

      // Check if this email should get admin role and assign it
      const adminEmails = ["leeztruestyles44@gmail.com"];
      const isAdminEmail = adminEmails.includes(formData.email.toLowerCase());

      if (isAdminEmail) {
        console.log("🔐 Admin email detected, assigning admin role...");

        // Wait for session to be fully established in cookies
        // This is critical for server-side API to read the session
        let sessionReady = false;
        let sessionWaitAttempts = 10;

        while (sessionWaitAttempts > 0 && !sessionReady) {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (session && !sessionError) {
            console.log("✅ Session confirmed on client side");
            sessionReady = true;
            // Additional wait to ensure cookies are set in browser
            await new Promise((resolve) => setTimeout(resolve, 1000));
            break;
          }

          console.log(
            `⏳ Waiting for session... (${sessionWaitAttempts} attempts left)`
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          sessionWaitAttempts--;
        }

        if (!sessionReady) {
          console.warn(
            "⚠️ Session not ready, admin role will be assigned on sign-in"
          );
        } else {
          // Try to create employee record directly from client FIRST
          // RLS allows users to insert their own employee record, so this should work
          // This avoids the session cookie issue with API calls
          console.log("➕ Attempting direct employee record creation...");
          let adminAssigned = false;

          try {
            const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
            const { data: directInsert, error: directError } = await supabase
              .from("employees")
              .insert({
                user_id: data.user.id,
                role: "admin",
                employee_code: employeeCode,
              })
              .select()
              .single();

            if (directError) {
              console.warn("⚠️ Direct insert failed:", directError.message);
              console.log("🔄 Trying API fallback...");

              // Fallback to API call (though it may also fail due to session cookie issue)
              try {
                const assignAdminResponse = await fetch(
                  "/api/auth/assign-admin",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                  }
                );

                const responseText = await assignAdminResponse.text();
                console.log(
                  "📥 API Response status:",
                  assignAdminResponse.status
                );

                if (assignAdminResponse.ok) {
                  try {
                    const adminData = JSON.parse(responseText);
                    console.log("✅ Admin role assigned via API:", adminData);
                    adminAssigned = true;
                  } catch (e) {
                    console.log(
                      "✅ Admin role assigned via API (response not JSON)"
                    );
                    adminAssigned = true;
                  }
                } else {
                  const errorData = responseText
                    ? JSON.parse(responseText)
                    : { error: "Unknown error" };
                  console.error(
                    "❌ API also failed:",
                    errorData?.error || `HTTP ${assignAdminResponse.status}`
                  );
                  console.warn(
                    "💡 Admin role will be assigned on dashboard access (dashboard layout has fallback)"
                  );
                }
              } catch (apiError: any) {
                console.error("❌ API call error:", apiError.message);
                console.warn(
                  "💡 Admin role will be assigned on dashboard access (dashboard layout has fallback)"
                );
              }
            } else {
              console.log(
                "✅ Admin role created successfully via direct insert:",
                directInsert
              );
              adminAssigned = true;
            }
          } catch (directErr: any) {
            console.error("❌ Direct insert error:", directErr.message);
            console.warn(
              "💡 Admin role will be assigned on dashboard access (dashboard layout has fallback)"
            );
          }

          // Wait for database to update
          if (adminAssigned) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // Check user's actual role from database (with retry)
      let userRole: string | null = null;
      let retries = 8; // Increased retries for admin emails

      console.log("🔍 Checking user role in database...");
      while (retries > 0 && !userRole) {
        try {
          const { data: employeeData, error: roleError } = await supabase
            .from("employees")
            .select("role")
            .eq("user_id", data.user.id)
            .single();

          if (!roleError && employeeData) {
            userRole = employeeData.role;
            console.log("✅ User role found:", userRole);
            break;
          } else {
            console.log(
              `⏳ Role check attempt ${9 - retries}/8 failed:`,
              roleError?.message || "No employee record found"
            );
            if (retries > 1) {
              // Wait longer between retries for admin emails
              const waitTime = isAdminEmail ? 1500 : 500;
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }
        } catch (roleCheckError: any) {
          console.warn(
            "⚠️ Error checking user role:",
            roleCheckError?.message || roleCheckError
          );
          if (retries > 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, isAdminEmail ? 1500 : 500)
            );
          }
        }
        retries--;
      }

      if (!userRole && isAdminEmail) {
        console.warn("⚠️ Admin email but role not found after all retries");
        console.warn(
          "💡 This might be a timing issue. Role will be checked again on dashboard load."
        );
      }

      setSuccess(true);

      // Final session verification before redirect
      // This ensures the server-side layout can read the session
      console.log("🔐 Final session verification before redirect...");
      let sessionEstablished = false;
      let sessionRetries = 8;

      while (sessionRetries > 0 && !sessionEstablished) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (session && !sessionError) {
          sessionEstablished = true;
          console.log("✅ Final session confirmed, ready to redirect");
          break;
        }
        console.log(
          `⏳ Waiting for final session sync... (${sessionRetries} attempts left)`
        );
        if (sessionError) {
          console.warn("Session error:", sessionError.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        sessionRetries--;
      }

      if (!sessionEstablished) {
        console.warn(
          "⚠️ Session not fully established, but proceeding with redirect"
        );
        console.warn(
          "💡 If dashboard shows auth error, try refreshing the page"
        );
      }

      // Additional wait to ensure cookies are fully set
      console.log("⏳ Waiting for cookies to be set...");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify session and cookies are ready
      const {
        data: { session: finalSession },
      } = await supabase.auth.getSession();

      if (finalSession) {
        console.log("✅ Session verified on client side");

        // Additional wait to ensure browser has processed cookies
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        console.warn("⚠️ Session not found in final check");
        console.warn(
          "💡 Cookies may not be set yet. Dashboard will handle auth check."
        );
      }

      // Redirect based on actual role from database
      console.log("🚀 Preparing redirect...");
      console.log("   - User role:", userRole || "None");
      console.log("   - Is admin email:", isAdminEmail);
      console.log("   - Session established:", !!finalSession);

      // Use setTimeout to ensure cookies are sent with the redirect
      setTimeout(
        () => {
          if (userRole === "admin" || userRole === "manager") {
            console.log("✅ Redirecting to dashboard for role:", userRole);
            // Use window.location for full page reload
            // This ensures cookies are sent with the request
            window.location.href = "/dashboard";
          } else if (isAdminEmail && !userRole) {
            console.log(
              "⚠️ Admin email but role not found yet, redirecting to dashboard anyway"
            );
            console.log(
              "💡 Dashboard will check role and may assign it automatically"
            );
            window.location.href = "/dashboard";
          } else {
            console.log("🏠 No admin role found, redirecting to:", redirectTo);
            router.push(redirectTo);
            router.refresh();
          }
        },
        500 // Short delay to ensure redirect happens after cookie test
      );
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setError(
        err.message ||
          "An unexpected error occurred. Please check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary-light/10 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {needsEmailConfirmation ? "Check Your Email!" : "Account Created!"}
          </h2>
          <p className="text-gray-600 mb-6">
            {needsEmailConfirmation
              ? "We've sent a confirmation email to your inbox. Please click the link in the email to verify your account, then you can sign in."
              : "Your account has been created successfully. Redirecting..."}
          </p>
          {needsEmailConfirmation ? (
            <Link
              href="/signin"
              className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              Go to Sign In
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              Go to Home
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary-light/10 px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              Leeztruestyles
            </h1>
          </Link>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign Up</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-primary font-semibold hover:text-primary-dark"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <Link href="/" className="hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary-light/10 px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
