
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAILS } from '@/config/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    let data, error;
    try {
        const result = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        data = result.data;
        error = result.error;
    } catch (fetchError: any) {
        logger.error('Network error during sign-in');
        const errorMessage = fetchError?.message || 'Network error: Unable to connect to authentication service. Please check your internet connection and try again.';
        throw new Error(errorMessage);
    }

    if (error) {
        redirect(`/signin?error=${encodeURIComponent(error.message)}`);
    }

    // Verify session is established
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        logger.debug('Session not found after sign-in - continuing');
    }

    // Admin Setup
    let userRole: string | null = null;
    const emailLower = email.toLowerCase();

    if (data.user && ADMIN_EMAILS.includes(emailLower)) {
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
                userRole = "admin";
            } else if (existingEmployee.role !== "admin") {
                await adminClient
                    .from("employees")
                    .update({ role: "admin" })
                    .eq("user_id", data.user.id);
                userRole = "admin";
            } else {
                userRole = "admin";
            }
        } catch (err) {
            logger.error("Admin auto-assignment failed:", err);
        }
    }

    // Check user role from database if not admin
    if (!userRole && data.user) {
        try {
            const { data: employeeData } = await supabase
                .from("employees")
                .select("role")
                .eq("user_id", data.user.id)
                .single();

            userRole = employeeData?.role || null;
        } catch (_) {
            // User might not be an employee
        }
    }

    // Determine redirect path
    let redirectTo = "/";
    if (userRole === "admin" || userRole === "manager") {
        redirectTo = "/dashboard";
    } else if (userRole === "seller") {
        redirectTo = "/dashboard";
    }

    revalidatePath('/', 'layout')
    revalidatePath('/dashboard')
    redirect(redirectTo)
}


export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const referralCode = formData.get('referralCode') as string | null

    if (!email || !password || !fullName) {
        return { error: 'All fields are required' }
    }

    // Server-side password validation
    if (!PASSWORD_REGEX.test(password)) {
        return { error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' }
    }

    let user = null;
    let session = null;

    try {
        // Attempt to create user via Admin API to skip email verification
        const adminClient = createAdminClient()
        const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        })

        if (adminError) throw adminError

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (signInError) throw signInError

        user = adminData.user;
        session = signInData.session;

    } catch (err: any) {
        if (err?.message?.includes("already registered") || err?.status === 422) {
            return { error: "User already registered" }
        }

        // Fallback to standard signup if Admin API fails
        if (err?.message?.includes("SUPABASE_SERVICE_ROLE_KEY") || !err?.code) {
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
            return { error: err.message || "Signup failed" }
        }
    }

    // Profile & Admin Setup
    if (user) {
        try {
            let client = supabase;
            try {
                client = createAdminClient();
            } catch (_) {
                // Use public client if service key missing
            }

            await client.from('users').upsert({
                id: user.id,
                email: email,
                full_name: fullName
            })

            // Create Leez Rewards loyalty account
            try {
                const { LoyaltyService } = await import('@/services/loyaltyService')
                await LoyaltyService.createAccount(user.id, fullName)

                // Award signup bonus points
                await LoyaltyService.awardSignupPoints(user.id)

                // Apply referral code if provided
                if (referralCode && referralCode.trim()) {
                    try {
                        const loyaltyAdmin = createAdminClient()
                        const { data: referrerAccount } = await loyaltyAdmin
                            .from('loyalty_accounts')
                            .select('user_id')
                            .eq('referral_code', referralCode.trim().toUpperCase())
                            .single()

                        if (referrerAccount && referrerAccount.user_id !== user.id) {
                            await loyaltyAdmin.from('referrals').insert({
                                referrer_id: referrerAccount.user_id,
                                referred_id: user.id,
                                referral_code: referralCode.trim().toUpperCase(),
                                status: 'pending',
                            })

                            const welcomeCode = `WELCOME-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
                            const expiresAt = new Date()
                            expiresAt.setDate(expiresAt.getDate() + 30)

                            await loyaltyAdmin.from('reward_codes').insert({
                                user_id: user.id,
                                code: welcomeCode,
                                type: 'referral_welcome',
                                discount_amount: 50,
                                expires_at: expiresAt.toISOString(),
                            })
                        }
                    } catch (refErr) {
                        logger.warn('Referral code application failed:', refErr)
                    }
                }
            } catch (loyaltyErr) {
                logger.warn('Loyalty account creation failed:', loyaltyErr)
            }

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
                } catch (_) {
                    logger.warn("Could not assign admin role (Check service key)")
                }
            }
        } catch (err) {
            logger.error("Profile/Admin setup failed:", err)
        }
    }

    revalidatePath('/', 'layout')

    if (session) {
        return { success: true, message: 'Account created successfully!' }
    } else {
        return { success: true, message: 'Account created! Please check your email to verify your account.' }
    }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/signin')
}
