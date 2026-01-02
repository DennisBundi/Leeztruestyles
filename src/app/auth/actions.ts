
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/config/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // 1. Validate inputs
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    // 2. Sign in
    let data, error;
    try {
        const result = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        data = result.data;
        error = result.error;
    } catch (fetchError: any) {
        // Handle network/fetch errors separately
        console.error('[Login Action] Network error during sign-in:', fetchError);
        console.error('[Login Action] Error details:', {
            message: fetchError?.message,
            name: fetchError?.name,
            stack: fetchError?.stack,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
            supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        });
        const errorMessage = fetchError?.message || 'Network error: Unable to connect to authentication service. Please check your internet connection and try again.';
        // For form actions, we need to throw the error so it can be caught by the form
        throw new Error(errorMessage);
    }

    if (error) {
        // Authentication error (wrong credentials, etc.)
        console.error('[Login Action] Authentication error:', error.message);
        // For form actions, redirect to signin with error
        redirect(`/signin?error=${encodeURIComponent(error.message)}`);
    }

    // 2.5. Verify session is established and cookies are set
    // This ensures cookies are properly set in the response
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session) {
        console.error('[Login Action] Session not found after sign-in:', sessionError);
        // Still continue - cookies might be set but session not immediately available
    } else {
        console.log('[Login Action] Session confirmed, cookies should be set');
    }

    // 3. Admin Setup
    let userRole: string | null = null;
    const emailLower = email.toLowerCase();
    console.log('[Login Action] Checking admin status for email:', emailLower);
    console.log('[Login Action] ADMIN_EMAILS list:', ADMIN_EMAILS);
    console.log('[Login Action] Is admin email?', ADMIN_EMAILS.includes(emailLower));
    
    if (data.user && ADMIN_EMAILS.includes(emailLower)) {
        console.log('[Login Action] Admin email detected, setting up admin role...');
        try {
            const adminClient = createAdminClient();

            const { data: existingEmployee } = await adminClient
                .from("employees")
                .select("*")
                .eq("user_id", data.user.id)
                .maybeSingle();

            if (!existingEmployee) {
                console.log('[Login Action] No existing employee record, creating admin...');
                await adminClient.from("employees").insert({
                    user_id: data.user.id,
                    role: "admin",
                    employee_code: `EMP-${Date.now().toString().slice(-6)}`
                });
                userRole = "admin";
                console.log('[Login Action] Admin role assigned (new employee)');
            } else if (existingEmployee.role !== "admin") {
                console.log('[Login Action] Existing employee with different role, updating to admin...');
                await adminClient
                    .from("employees")
                    .update({ role: "admin" })
                    .eq("user_id", data.user.id);
                userRole = "admin";
                console.log('[Login Action] Admin role assigned (updated existing)');
            } else {
                userRole = "admin";
                console.log('[Login Action] Admin role already set');
            }
        } catch (err) {
            console.error("[Login Action] Admin auto-assignment failed:", err);
        }
    }

    // 4. Check user role from database if not admin
    if (!userRole && data.user) {
        try {
            const { data: employeeData } = await supabase
                .from("employees")
                .select("role")
                .eq("user_id", data.user.id)
                .single();
            
            userRole = employeeData?.role || null;
        } catch (err) {
            // User might not be an employee, that's okay
            console.log("User is not an employee");
        }
    }

    // 5. Determine redirect path
    let redirectTo = "/";
    if (userRole === "admin" || userRole === "manager") {
        redirectTo = "/dashboard";
    } else if (userRole === "seller") {
        redirectTo = "/dashboard/products";
    }

    console.log('[Login Action] User role determined:', userRole);
    console.log('[Login Action] Redirect path set to:', redirectTo);
    console.log('[Login Action] Email:', email.toLowerCase());
    console.log('[Login Action] Is in ADMIN_EMAILS:', ADMIN_EMAILS.includes(email.toLowerCase()));

    // 6. Revalidate paths
    revalidatePath('/', 'layout')
    revalidatePath('/dashboard')

    // 7. Use server-side redirect to ensure cookies are set before navigation
    // This is more reliable than client-side redirect
    redirect(redirectTo)
}


export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    if (!email || !password || !fullName) {
        return { error: 'All fields are required' }
    }

    let user = null;
    let session = null;

    try {
        // Attempt to create user via Admin API to skip email verification
        const adminClient = createAdminClient()
        const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: { full_name: fullName }
        })

        if (adminError) throw adminError

        // User created and confirmed. Now sign in to establish session cookie.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (signInError) throw signInError

        user = adminData.user;
        session = signInData.session;

    } catch (err: any) {
        // Check if user already exists
        if (err?.message?.includes("already registered") || err?.status === 422) {
            return { error: "User already registered" }
        }

        // Fallback to standard signup if Admin API fails (e.g. missing service key)
        if (err?.message?.includes("SUPABASE_SERVICE_ROLE_KEY") || !err?.code) {
            console.log("Admin creation unavailable, falling back to standard signup:", err.message)
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            })

            if (error) return { error: error.message }
            user = data.user
            session = data.session
        } else {
            // Other error
            return { error: err.message || "Signup failed" }
        }
    }

    // Admin & Profile Setup
    if (user) {
        try {
            // We use the admin client if available, otherwise the logged-in user client
            let client = supabase;
            try {
                // Try admin client again for strict RLS environments
                client = createAdminClient();
            } catch (e) {
                // Ignore if missing key, use public client which should work for 'upsert' on own profile
            }

            // Create Profile
            await client.from('users').upsert({
                id: user.id,
                email: email,
                full_name: fullName
            })

            // Check if admin email and assign role
            if (ADMIN_EMAILS.includes(email.toLowerCase())) {
                try {
                    const adminClient = createAdminClient()
                    const employeeCode = `EMP-${Date.now().toString().slice(-6)}`
                    await adminClient.from('employees').insert({
                        user_id: user.id,
                        role: 'admin',
                        employee_code: employeeCode,
                    })
                } catch (e) {
                    console.warn("Could not assign admin role (Check service key):", e)
                }
            }
        } catch (err) {
            console.error("Profile/Admin setup failed:", err)
        }
    }

    revalidatePath('/', 'layout')

    if (session) {
        // Return success with session info so client can handle redirect/UI
        return { success: true, message: 'Account created successfully!' }
    } else {
        // Only happens if fallback signup was used and email confirmation is ON
        return { success: true, message: 'Account created! Please check your email to verify your account.' }
    }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/signin')
}

