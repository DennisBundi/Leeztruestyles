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

    // Get user's employee record
    const employee = await getEmployee(user.id);
    
    if (!employee) {
      // User is not an employee, return zeros
      return NextResponse.json({
        totalSales: 0,
        totalOrders: 0,
        salesThisWeek: 0,
      });
    }

    // Calculate date range for "this week" (last 7 days including today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Fetch all orders where this employee is the seller
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('seller_id', employee.id)
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

    // Filter completed orders
    const completedOrders = (allOrders || []).filter(
      (order: any) => order.status === 'completed'
    );

    // Calculate total sales (sum of completed orders)
    const totalSales = completedOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total_amount || 0),
      0
    );

    // Calculate total commission (sum of commission from completed orders)
    const totalCommission = completedOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.commission || 0),
      0
    );

    // Calculate total orders count
    const totalOrders = completedOrders.length;

    // Calculate sales this week (completed orders in last 7 days)
    const weekOrders = completedOrders.filter((order: any) => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate >= weekAgo && orderDate <= today;
    });

    const salesThisWeek = weekOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total_amount || 0),
      0
    );

    // Calculate commission this week
    const commissionThisWeek = weekOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.commission || 0),
      0
    );

    return NextResponse.json({
      totalSales,
      totalCommission,
      totalOrders,
      salesThisWeek,
      commissionThisWeek,
      userRole, // Include role so frontend knows what to display
    });
  } catch (error: any) {
    console.error('User stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

