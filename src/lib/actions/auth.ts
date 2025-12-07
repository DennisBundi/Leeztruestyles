"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// List of emails that should automatically get admin role
const ADMIN_EMAILS = ["leeztruestyles44@gmail.com"];

export type SignInResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
  userRole?: string | null;
};

export async function signInAction(
  email: string,
  password: string,
  redirectTo: string = "/"
): Promise<SignInResult> {
  try {
    const supabase = await createClient();

    // Sign in with password (server-side)
    // This will automatically set cookies via the server client
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email,
        password,
      }
    );

    if (signInError || !data.user) {
      return {
        success: false,
        error: signInError?.message || "Failed to sign in",
      };
    }

    console.log(
      "✅ [signInAction] User signed in:",
      data.user.id,
      data.user.email
    );

    // Verify session is established by getting it
    // This ensures cookies are properly set
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (!session) {
      console.warn(
        "⚠️ [signInAction] Session not found after sign-in:",
        sessionError?.message
      );
      // Continue anyway - cookies might be set but session not immediately available
    } else {
      console.log("✅ [signInAction] Session confirmed");
    }

    // Check if this email should get admin role
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
    let userRole: string | null = null;

    if (isAdminEmail) {
      try {
        // Use admin client (service role) to bypass RLS for employee creation
        const adminClient = createAdminClient();

        // Ensure user profile exists (using regular client)
        await supabase.from("users").upsert(
          {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || "Admin User",
          },
          {
            onConflict: "id",
          }
        );

        // Check if employee record exists (using admin client to bypass RLS)
        const { data: existingEmployee } = await adminClient
          .from("employees")
          .select("*")
          .eq("user_id", data.user.id)
          .single();

        if (!existingEmployee) {
          // Create employee record with admin role using admin client (bypasses RLS)
          const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
          const { error: employeeError } = await adminClient
            .from("employees")
            .insert({
              user_id: data.user.id,
              role: "admin",
              employee_code: employeeCode,
            });

          if (employeeError) {
            console.warn(
              "⚠️ [signInAction] Failed to create admin employee:",
              employeeError
            );
          } else {
            console.log("✅ [signInAction] Admin role assigned");
            // We just created it, so we know the role is admin
            userRole = "admin";
          }
        } else if (existingEmployee.role !== "admin") {
          // Update existing employee to admin using admin client (bypasses RLS)
          const { error: updateError } = await adminClient
            .from("employees")
            .update({ role: "admin" })
            .eq("user_id", data.user.id);

          if (updateError) {
            console.warn(
              "⚠️ [signInAction] Failed to update role:",
              updateError
            );
          } else {
            console.log("✅ [signInAction] Role updated to admin");
            // We just updated it, so we know the role is admin
            userRole = "admin";
          }
        } else {
          // Employee already exists with admin role
          userRole = "admin";
        }
      } catch (adminError: any) {
        console.warn(
          "⚠️ [signInAction] Error assigning admin role:",
          adminError?.message || adminError
        );
        // Don't fail signin if admin assignment fails
      }
    }

    // If we don't have a role yet (non-admin or admin assignment failed), check from database
    if (!userRole) {
      const { data: employeeData } = await supabase
        .from("employees")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      userRole = employeeData?.role || null;
    }

    // Determine redirect path based on role
    let finalRedirectTo = redirectTo;
    if (userRole === "admin" || userRole === "manager") {
      finalRedirectTo = "/dashboard";
    } else if (redirectTo === "/") {
      finalRedirectTo = "/";
    }

    // Revalidate paths to ensure fresh data
    revalidatePath("/dashboard");
    revalidatePath("/");

    console.log(
      "✅ [signInAction] Sign-in successful, redirecting to:",
      finalRedirectTo
    );

    // Return result instead of redirecting
    // The client will handle redirect with window.location to ensure cookies are sent
    return {
      success: true,
      redirectTo: finalRedirectTo,
      userRole,
    };
  } catch (error: any) {
    console.error("❌ [signInAction] Sign-in error:", error);
    return {
      success: false,
      error: error?.message || "An unexpected error occurred during sign in",
    };
  }
}
