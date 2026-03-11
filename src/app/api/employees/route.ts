import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const employeeSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'seller']),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = employeeSchema.parse(body);

    // Create admin client with service role key to list users
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find user by email using Admin API
    // Note: perPage is set high to cover most use cases. For very large user bases, implement pagination.
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { error: 'Failed to look up user' },
        { status: 500 }
      );
    }

    const targetUser = users?.find(u => u.email?.toLowerCase() === validated.email.toLowerCase());

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Unable to process this request. Please verify the email and try again.' },
        { status: 404 }
      );
    }

    // Check if employee already exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', targetUser.id)
      .single();

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'This user is already an employee' },
        { status: 400 }
      );
    }

    // Generate employee code
    const employeeCode = `EMP${Date.now().toString().slice(-6)}`;

    // Create employee record using admin client to bypass RLS
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: targetUser.id,
        role: validated.role,
        employee_code: employeeCode,
      })
      .select()
      .single();

    if (employeeError || !employee) {
      console.error('Employee creation error:', employeeError);
      return NextResponse.json(
        { error: 'Failed to create employee' },
        { status: 500 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('Employee creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authentication and admin/manager role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create admin client for user lookups
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch all auth users once and build a lookup map — avoids N+1 getUserById calls
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const userMap = new Map((authUsers ?? []).map(u => [u.id, u]));

    // Fetch all employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (employeesError) {
      console.error('Employees fetch error:', employeesError);
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    // Fetch sales count, revenue, and commission for each employee from orders table
    const employeesWithStats = await Promise.all(
      (employees || []).map(async (employee: any) => {
        // Get orders where this employee is the seller (POS sales)
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount, commission, status')
          .eq('seller_id', employee.id)
          .eq('sale_type', 'pos');

        if (ordersError) {
          console.error('Error fetching orders for employee:', employee.id, ordersError);
        }

        // Calculate sales stats from orders
        const sales_count = orders?.length || 0;
        const total_sales = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;
        const total_commission = orders?.reduce((sum, order) => sum + parseFloat(order.commission || 0), 0) || 0;

        // Try to get user email from auth if user_id exists
        let userEmail = employee.email || '';
        let userName = employee.name || '';

        if (employee.user_id) {
          const authUser = userMap.get(employee.user_id);
          if (authUser) {
            userEmail = authUser.email || userEmail;
            userName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || userName;
          }
        }

        return {
          id: employee.id,
          user_id: employee.user_id,
          employee_code: employee.employee_code || 'N/A',
          name: userName || 'Unknown Employee',
          email: userEmail || 'No email',
          role: employee.role,
          created_at: employee.created_at,
          last_commission_payment_date: employee.last_commission_payment_date || null,
          sales_count,
          total_sales,
          total_commission,
        };
      })
    );

    return NextResponse.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Employees fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Create admin client for user deletion
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get employee record to get user_id
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Block deletion if employee has existing order history — would orphan seller_id references
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('seller_id', employeeId)
      .limit(1);

    if (orders && orders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee with existing order history. Reassign or archive their orders first.' },
        { status: 409 }
      );
    }

    // Delete employee record first
    const { error: deleteEmployeeError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', employeeId);

    if (deleteEmployeeError) {
      console.error('Error deleting employee:', deleteEmployeeError);
      return NextResponse.json(
        { error: 'Failed to delete employee record' },
        { status: 500 }
      );
    }

    // Delete user account if user_id exists
    if (employee.user_id) {
      try {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(employee.user_id);
        if (deleteUserError) {
          console.error('Error deleting user:', deleteUserError);
          return NextResponse.json(
            { error: 'Employee deleted but failed to delete user account' },
            { status: 500 }
          );
        }
      } catch (userDeleteErr) {
        console.error('Exception deleting user:', userDeleteErr);
        return NextResponse.json(
          { error: 'Employee deleted but failed to delete user account' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Employee and user account deleted successfully' 
    });
  } catch (error) {
    console.error('Employee deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
