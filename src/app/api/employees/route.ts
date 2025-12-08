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
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

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
        { error: 'User not found with this email. The user must sign up first.' },
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
        { error: 'Invalid request data', details: error.errors },
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

    // Create admin client for getUserById
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

    // Fetch all employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (employeesError) {
      console.error('Employees fetch error:', employeesError);
      return NextResponse.json(
        { error: 'Failed to fetch employees', details: employeesError.message },
        { status: 500 }
      );
    }

    // Fetch sales count and revenue for each employee
    const employeesWithStats = await Promise.all(
      (employees || []).map(async (employee: any) => {
        // Get sales count and total revenue
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('employee_id', employee.id);

        const sales_count = sales?.length || 0;
        const total_sales = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

        // Try to get user email from auth if user_id exists
        let userEmail = employee.email || '';
        let userName = employee.name || '';

        if (employee.user_id) {
          try {
            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(employee.user_id);
            if (user) {
              userEmail = user.email || userEmail;
              userName = user.user_metadata?.name || user.email?.split('@')[0] || userName;
            }
          } catch (err) {
            console.error('Error fetching user:', err);
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
          sales_count,
          total_sales,
        };
      })
    );

    return NextResponse.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Employees fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
