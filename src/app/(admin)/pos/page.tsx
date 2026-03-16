import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getEmployee } from '@/lib/auth/roles';
import { canAccessPOS, getUserRole } from '@/lib/auth/roles';
import POSInterface from '@/components/pos/POSInterface';

export default async function POSPage() {
  const supabase = await createClient();
  
  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin?redirect=/pos');
  }

  // Check user role
  const userRole = await getUserRole(user.id);
  if (!canAccessPOS(userRole)) {
    redirect('/');
  }

  // Get employee record
  const employee = await getEmployee(user.id);
  
  // If no employee record, redirect (shouldn't happen if role check passed)
  if (!employee) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-gradient-to-br from-[#3d0020] via-[#220025] to-[#130030] -z-10" />
      {/* Header */}
      <div className="glass border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Point of Sale</h1>
                <p className="text-xs text-white/50 mt-0.5">In-store sales system</p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors font-medium text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60">
                Employee: <span className="font-semibold text-white">{employee.employee_code}</span>
              </div>
              <div className="text-xs text-white/50 mt-1 capitalize">{employee.role}</div>
            </div>
          </div>
        </div>
      </div>
      <POSInterface employeeId={employee.id} employeeCode={employee.employee_code} userRole={userRole} />
    </div>
  );
}

