import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

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

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', validated.email)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 }
      );
    }

    // Generate employee code
    const employeeCode = `EMP${Date.now().toString().slice(-6)}`;

    // Create employee record
    const { data: employee, error: employeeError } = await supabase
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

