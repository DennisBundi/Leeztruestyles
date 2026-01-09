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

    // Calculate today's date range (00:00:00 to 23:59:59 today)
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

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

    // Filter orders for TODAY's stats (Total Orders, Completed, Pending) - today only
    const todayOrders = (allOrders || []).filter((order: any) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= todayStart && orderDate <= todayEnd;
    });

    // Calculate today's stats
    const totalOrdersToday = todayOrders.length;
    const completedOrdersToday = todayOrders.filter((o: any) => o.status === 'completed').length;
    const pendingOrdersToday = todayOrders.filter((o: any) => o.status === 'pending').length;
    const totalSalesToday = todayOrders
      .filter((o: any) => o.status === 'completed')
      .reduce((sum: number, order: any) => sum + parseFloat(order.total_amount || 0), 0);

    // Filter orders for COMMISSION calculation - compounds from last_payment_date until now
    // Includes all completed orders after last payment date (not limited to today)
    const commissionOrders = (allOrders || []).filter((order: any) => {
      // Must be completed
      if (order.status !== 'completed') {
        return false;
      }

      const orderDate = new Date(order.created_at);

      // Must be after last payment date (if payment date exists)
      if (lastPaymentDate && orderDate <= lastPaymentDate) {
        return false;
      }

      return true;
    });

    // Calculate compounded commission from last payment date until now
    const totalCommission = commissionOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.commission || 0),
      0
    );

    // For backward compatibility, keep these fields but use today's values
    const totalSales = totalSalesToday;
    const totalOrders = totalOrdersToday;
    const salesThisWeek = totalSalesToday;
    const commissionThisWeek = totalCommission;

    return NextResponse.json({
      totalSales,
      totalCommission,
      totalOrders,
      salesThisWeek,
      commissionThisWeek,
      // Today's stats
      totalOrdersToday,
      completedOrdersToday,
      pendingOrdersToday,
      totalSalesToday,
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

