import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/service'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const adminEmails = ['leeztruestyles44@gmail.com'];
        const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');

        if (isAdmin) {
          try {
            await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || 'Admin User',
              }, {
                onConflict: 'id',
              });

            const { data: existingEmployee } = await supabase
              .from('employees')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (!existingEmployee) {
              const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
              await supabase
                .from('employees')
                .insert({
                  user_id: user.id,
                  role: 'admin',
                  employee_code: employeeCode,
                });
            } else if (existingEmployee.role !== 'admin') {
              await supabase
                .from('employees')
                .update({ role: 'admin' })
                .eq('user_id', user.id);
            }

            console.log('Admin role assigned after email confirmation');
          } catch (adminError) {
            console.warn('Error assigning admin role:', adminError);
          }

          await sendWelcomeEmail(user.id)
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        }

        await sendWelcomeEmail(user.id)
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error or no code, redirect to signin
  return NextResponse.redirect(new URL('/signin', requestUrl.origin));
}

