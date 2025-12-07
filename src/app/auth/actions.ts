
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
        return { error: 'Email and password are required' }
    }

    // 2. Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // 3. Admin Setup
    if (data.user && ADMIN_EMAILS.includes(email.toLowerCase())) {
        try {
            const adminClient = createAdminClient();

            const { data: existingEmployee } = await adminClient
                .from("employees")
                .select("*")
                .eq("user_id", data.user.id)
                .maybeSingle();

            if (!existingEmployee) {
                await adminClient.from("employees").insert({
                    user_id: data.user.id,
                    role: "admin",
                    employee_code: `EMP-${Date.now().toString().slice(-6)}`
                });
            } else if (existingEmployee.role !== "admin") {
                await adminClient
                    .from("employees")
                    .update({ role: "admin" })
                    .eq("user_id", data.user.id);
            }
        } catch (err) {
            console.error("Admin auto-assignment failed:", err);
        }
    }

    // 4. Redirect
    revalidatePath('/', 'layout')
    redirect('/dashboard')
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
