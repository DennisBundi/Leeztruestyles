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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-xs text-gray-500 mt-0.5">In-store sales system</p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Employee: <span className="font-semibold text-gray-900">{employee.employee_code}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 capitalize">{employee.role}</div>
            </div>
          </div>
        </div>
      </div>
      <POSInterface employeeId={employee.id} employeeCode={employee.employee_code} />
    </div>
  );
}

