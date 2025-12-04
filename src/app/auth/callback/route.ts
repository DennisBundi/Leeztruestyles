import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Get the user to check if they're admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if this email should get admin role
        const adminEmails = ['leeztruestyles44@gmail.com'];
        const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
        
        if (isAdmin) {
          try {
            // Assign admin role directly (server-side)
            // Ensure user profile exists
            await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || 'Admin User',
              }, {
                onConflict: 'id',
              });

            // Check if employee record exists
            const { data: existingEmployee } = await supabase
              .from('employees')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (!existingEmployee) {
              // Create employee record with admin role
              const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
              await supabase
                .from('employees')
                .insert({
                  user_id: user.id,
                  role: 'admin',
                  employee_code: employeeCode,
                });
            } else if (existingEmployee.role !== 'admin') {
              // Update existing employee to admin
              await supabase
                .from('employees')
                .update({ role: 'admin' })
                .eq('user_id', user.id);
            }
            
            console.log('Admin role assigned after email confirmation');
          } catch (adminError) {
            console.warn('Error assigning admin role:', adminError);
          }
          
          // Redirect admin users to dashboard
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        }
      }
      
      // Redirect to the specified next URL or home
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error or no code, redirect to signin
  return NextResponse.redirect(new URL('/signin', requestUrl.origin));
}

