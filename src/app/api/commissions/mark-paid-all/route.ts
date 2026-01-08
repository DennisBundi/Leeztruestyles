import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

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

    // Use admin client for database operations to bypass RLS
    const adminClient = createAdminClient();

    // Get count of sellers before update
    const { count: sellerCount, error: countError } = await adminClient
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'seller');

    if (countError) {
      console.error('Error counting sellers:', countError);
    }

    // Update last_commission_payment_date to current timestamp for all sellers
    const now = new Date().toISOString();
    const { data: updatedEmployees, error: updateError } = await adminClient
      .from('employees')
      .update({ last_commission_payment_date: now })
      .eq('role', 'seller')
      .select('id');

    if (updateError) {
      console.error('Error updating commission payment dates:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark commissions as paid', details: updateError.message },
        { status: 500 }
      );
    }

    const updatedCount = updatedEmployees?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Commissions marked as paid for ${updatedCount} seller(s)`,
      payment_date: now,
      count: updatedCount,
    });
  } catch (error: any) {
    console.error('Mark all paid API error:', error);

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

