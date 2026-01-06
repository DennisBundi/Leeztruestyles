import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const markPaidSchema = z.object({
  employee_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role - only admins and managers can mark commissions as paid
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = markPaidSchema.parse(body);

    // Use admin client for database operations to bypass RLS
    const adminClient = createAdminClient();

    // Verify the employee exists and is a seller
    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .select('id, role')
      .eq('id', validated.employee_id)
      .single();

    if (employeeError || !employee) {
      console.error('Error fetching employee:', employeeError);
      return NextResponse.json(
        { error: 'Employee not found', details: employeeError?.message },
        { status: 404 }
      );
    }

    if (employee.role !== 'seller') {
      return NextResponse.json(
        { error: 'Commissions can only be marked as paid for sellers' },
        { status: 400 }
      );
    }

    // Update last_commission_payment_date to current timestamp
    const now = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from('employees')
      .update({ last_commission_payment_date: now })
      .eq('id', validated.employee_id);

    if (updateError) {
      console.error('Error updating commission payment date:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark commissions as paid', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Commissions marked as paid successfully',
      payment_date: now,
    });
  } catch (error: any) {
    console.error('Mark paid API error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

