import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole, getEmployee } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's employee record (including last_commission_payment_date)
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id, role, last_commission_payment_date')
      .eq('user_id', user.id)
      .single();

    if (employeeError || !employeeData) {
      // User is not an employee, return zeros
      return NextResponse.json({
        totalSales: 0,
        totalOrders: 0,
        salesThisWeek: 0,
      });
    }

    // Calculate current calendar week (Monday 00:00:00 to Sunday 23:59:59)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // Days to subtract to get to Monday
    
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Get last payment date if it exists
    const lastPaymentDate = employeeData.last_commission_payment_date
      ? new Date(employeeData.last_commission_payment_date)
      : null;

    // Fetch all orders where this employee is the seller (include commission field)
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, commission, status, created_at')
      .eq('seller_id', employeeData.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders for user stats:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    // Get user role to determine what to show
    const userRole = await getUserRole(user.id);

    // Filter orders based on:
    // 1. Status must be 'completed'
    // 2. Order must be in current calendar week (Monday-Sunday)
    // 3. Order must be created after last_commission_payment_date (if exists)
    const filteredOrders = (allOrders || []).filter((order: any) => {
      // Must be completed
      if (order.status !== 'completed') {
        return false;
      }

      const orderDate = new Date(order.created_at);

      // Must be in current calendar week
      if (orderDate < currentWeekStart || orderDate > currentWeekEnd) {
        return false;
      }

      // Must be after last payment date (if payment date exists)
      if (lastPaymentDate && orderDate <= lastPaymentDate) {
        return false;
      }

      return true;
    });

    // Calculate stats from filtered orders (current week only, after last payment)
    const totalSales = filteredOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total_amount || 0),
      0
    );

    const totalCommission = filteredOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.commission || 0),
      0
    );

    const totalOrders = filteredOrders.length;

    // For current week stats, they're the same as totals since we're only showing current week
    const salesThisWeek = totalSales;
    const commissionThisWeek = totalCommission;

    return NextResponse.json({
      totalSales,
      totalCommission,
      totalOrders,
      salesThisWeek,
      commissionThisWeek,
      userRole, // Include role so frontend knows what to display
      lastCommissionPaymentDate: employeeData.last_commission_payment_date || null, // Include last payment date
    });
  } catch (error: any) {
    console.error('User stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

