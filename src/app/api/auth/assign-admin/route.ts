import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// List of emails that should automatically get admin role
const ADMIN_EMAILS = [
  "leeztruestyles44@gmail.com",
  // Add more admin emails here if needed
];

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 [assign-admin] Starting admin assignment process...");

    // Try to get user ID from request headers if available (for debugging)
    const authHeader = request.headers.get("authorization");
    console.log("📋 [assign-admin] Request headers:", {
      hasAuthHeader: !!authHeader,
      cookieCount: request.cookies.getAll().length,
    });

    const supabase = await createClient();

    // Get the current user - try getUser first
    let user = null;
    let authError = null;

    const {
      data: { user: getUserResult },
      error: getUserError,
    } = await supabase.auth.getUser();

    user = getUserResult;
    authError = getUserError;

    // If getUser fails, try getSession as fallback
    if (!user) {
      console.log("🔄 [assign-admin] getUser failed, trying getSession...");
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (session?.user) {
        user = session.user;
        authError = null;
        console.log("✅ [assign-admin] Got user from session");
      } else {
        authError = sessionError || getUserError;
      }
    }

    console.log("👤 [assign-admin] User check:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
    });

    if (authError || !user) {
      console.error(
        "❌ [assign-admin] Auth failed:",
        authError?.message || "No user"
      );
      console.warn(
        "💡 [assign-admin] This is expected if called immediately after signup."
      );
      console.warn(
        "💡 [assign-admin] The direct insert from client or dashboard layout fallback will handle admin assignment."
      );
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: authError?.message || "No user found",
          note: "Session may not be available yet. Admin role will be assigned via fallback methods.",
        },
        { status: 401 }
      );
    }

    // Check if user email is in admin list
    const userEmail = (user.email || "").toLowerCase();
    if (!ADMIN_EMAILS.includes(userEmail)) {
      console.warn("⚠️ [assign-admin] Email not in admin list:", userEmail);
      return NextResponse.json(
        { error: "Email not authorized for admin access", email: userEmail },
        { status: 403 }
      );
    }

    console.log("✅ [assign-admin] Email authorized:", userEmail);

    // Ensure user profile exists in users table
    console.log("👤 [assign-admin] Ensuring user profile exists...");
    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || "Admin User",
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      console.error(
        "❌ [assign-admin] Error creating/updating user profile:",
        profileError
      );
      // Continue anyway - profile might already exist
    } else {
      console.log("✅ [assign-admin] User profile ensured");
    }

    // Check if user already has admin role
    console.log("🔍 [assign-admin] Checking for existing employee record...");
    const { data: existingEmployee, error: checkError } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected if no record exists
      console.warn(
        "⚠️ [assign-admin] Error checking existing employee:",
        checkError.message
      );
    }

    if (existingEmployee) {
      console.log(
        "📋 [assign-admin] Existing employee found:",
        existingEmployee.role
      );
      if (existingEmployee.role === "admin") {
        console.log("✅ [assign-admin] User already has admin role");
        return NextResponse.json({
          message: "User already has admin role",
          employee: existingEmployee,
        });
      } else {
        // Update existing employee to admin
        console.log("🔄 [assign-admin] Updating role to admin...");
        const { data: updatedEmployee, error: updateError } = await supabase
          .from("employees")
          .update({ role: "admin" })
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateError) {
          console.error(
            "❌ [assign-admin] Failed to update role:",
            updateError
          );
          return NextResponse.json(
            { error: "Failed to update role", details: updateError.message },
            { status: 500 }
          );
        }

        console.log("✅ [assign-admin] Role updated to admin");
        return NextResponse.json({
          message: "Role updated to admin",
          employee: updatedEmployee,
        });
      }
    }

    // Create employee record with admin role
    console.log("➕ [assign-admin] Creating new employee record...");
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

    if (employeeError) {
      console.error(
        "❌ [assign-admin] Error creating employee record:",
        employeeError
      );
      return NextResponse.json(
        {
          error: "Failed to create admin account",
          details: employeeError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ [assign-admin] Admin account created successfully");
    return NextResponse.json({
      message: "Admin account created successfully",
      employee,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
