'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    const checkAndRedirect = async () => {
      const supabase = createClient();
      
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user has admin role
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (employeeData?.role === 'admin' || employeeData?.role === 'manager') {
          // Use window.location for full page reload to ensure middleware runs
          window.location.href = '/dashboard';
        }
      }
    };

    checkAndRedirect();
  }, [router]);
}








