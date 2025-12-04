"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log("User signed in:", data.user.id, data.user.email);

        // Check if this email should get admin role and assign it
        const adminEmails = ["leeztruestyles44@gmail.com"];
        const isAdminEmail = adminEmails.includes(formData.email.toLowerCase());

        if (isAdminEmail) {
          try {
            console.log("Attempting to assign admin role...");
            const assignAdminResponse = await fetch("/api/auth/assign-admin", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (assignAdminResponse.ok) {
              const adminData = await assignAdminResponse.json();
              console.log("Admin role assigned:", adminData);
            } else {
              const errorData = await assignAdminResponse
                .json()
                .catch(() => ({}));
              console.warn(
                "Could not assign admin role automatically:",
                errorData
              );
            }

            // Wait a moment for the database to update
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (adminError) {
            console.warn("Error assigning admin role:", adminError);
            // Don't fail signin if admin assignment fails
          }
        }

        // Check user's actual role from database (with retry)
        let userRole: string | null = null;
        let retries = 3;

        while (retries > 0 && !userRole) {
          try {
            const { data: employeeData, error: roleError } = await supabase
              .from("employees")
              .select("role")
              .eq("user_id", data.user.id)
              .single();

            if (!roleError && employeeData) {
              userRole = employeeData.role;
              console.log("User role found:", userRole);
              break;
            } else {
              console.log("Role check attempt failed:", roleError?.message);
              if (retries > 1) {
                // Wait before retrying
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            }
          } catch (roleCheckError) {
            console.warn("Error checking user role:", roleCheckError);
            if (retries > 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
          retries--;
        }

        // Ensure session is established by getting it
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("Session established:", session ? "Yes" : "No");

        // Redirect based on role
        if (userRole === "admin" || userRole === "manager") {
          console.log("Redirecting to dashboard for role:", userRole);
          // Wait for cookies to be set and persisted
          await new Promise((resolve) => setTimeout(resolve, 1500));
          // Force a full page reload to ensure middleware runs and session is read
          window.location.href = "/dashboard";
          return;
        } else if (userRole) {
          console.log("User has role:", userRole, "- redirecting to home");
        } else {
          console.log("No role found - redirecting to home");
        }

        // Default redirect - use redirect parameter if provided, otherwise home
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-600 mt-2">Welcome back</p>
        </div>

        {/* Sign In Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-primary font-semibold hover:text-primary-dark"
              >
                Sign Up
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

export default function SignInPage() {
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
      <SignInForm />
    </Suspense>
  );
}
