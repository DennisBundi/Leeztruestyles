import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatOrderId } from '@/lib/utils/orderId';

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

    // Check user role
    const userRole = await getUserRole(user.id);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate today's date range (00:00:00 to 23:59:59 today)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Build query - filter by today's date only (for everyone)
    const query = supabase
      .from('orders')
      .select('*')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());
    
    console.log('Orders API - fetching today\'s orders (role:', userRole, ')');
    console.log('Orders API - date range:', todayStart.toISOString(), 'to', todayEnd.toISOString());
    
    const { data: orders, error: ordersError } = await query
      .order('created_at', { ascending: false });
    
    console.log('Orders API - fetched orders for today:', orders?.length || 0);

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', details: ordersError.message },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Fetch related user data separately to avoid RLS issues
    // Use admin client to bypass RLS for fetching users and employees
    const adminClient = createAdminClient();
    
    const userIds = [...new Set(orders.map((o: any) => o.user_id).filter(Boolean))];
    const sellerIds = [...new Set(orders.map((o: any) => o.seller_id).filter(Boolean))];

    // Fetch users using admin client (bypasses RLS)
    const usersMap = new Map();
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await adminClient
        .from('users')
        .select('id, full_name, email, phone')
        .in('id', userIds);
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else if (users) {
        users.forEach((u: any) => {
          usersMap.set(u.id, u);
        });
      }
    }

    // Fetch employees using admin client (bypasses RLS)
    const employeesMap = new Map();
    if (sellerIds.length > 0) {
      const { data: employees, error: employeesError } = await adminClient
        .from('employees')
        .select('id, employee_code, role')
        .in('id', sellerIds);
      
      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
      } else if (employees) {
        employees.forEach((e: any) => {
          employeesMap.set(e.id, e);
        });
      }
    }

    // Transform orders to match the frontend format
    const formattedOrders = orders.map((order: any) => {
      const user = order.user_id ? usersMap.get(order.user_id) : null;
      const employee = order.seller_id ? employeesMap.get(order.seller_id) : null;
      
      return {
        id: order.id,
        order_number: formatOrderId(order.id), // Short readable order number
        customer: user?.full_name || 'Guest Customer',
        email: user?.email || 'N/A',
        seller: employee?.employee_code || '-',
        seller_role: employee?.role || null, // Include seller's role to check if admin
        type: order.sale_type || 'online',
        amount: parseFloat(order.total_amount || 0),
        commission: parseFloat(order.commission || 0), // Commission for this order
        status: order.status || 'pending',
        date: order.created_at, // Keep as ISO string, will be converted to Date in frontend
        payment_method: order.payment_method || 'N/A',
        order_id: order.id, // Keep original ID for reference
        seller_id: order.seller_id,
        user_id: order.user_id,
      };
    });

    // Orders are already sorted by created_at descending (most recent first)
    // from the Supabase query above, so we can return them as-is
    console.log('Orders API - returning', formattedOrders.length, 'orders');
    if (formattedOrders.length > 0) {
      console.log('Orders API - first order (most recent):', {
        id: formattedOrders[0].id,
        date: formattedOrders[0].date,
        customer: formattedOrders[0].customer,
      });
    }

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
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
      return NextResponse.json(
        { error: 'Only admins can delete orders' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      );
    }

    // Use admin client to ensure deletion works (order_items will be deleted via CASCADE)
    const adminClient = createAdminClient();

    // Delete order (order_items will be deleted automatically via CASCADE)
    const { error: deleteError } = await adminClient
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteError) {
      console.error('Order deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete order', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('Order deletion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

