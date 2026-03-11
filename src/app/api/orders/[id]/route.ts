import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatOrderId } from '@/lib/utils/orderId';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role — admin and manager only (sellers are excluded)
    const userRole = await getUserRole(user.id);
    if (!userRole || userRole === 'seller') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Fetch order with items and nested product info
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        payment_method,
        sale_type,
        total_amount,
        user_id,
        seller_id,
        order_items (
          id,
          product_id,
          size,
          color,
          quantity,
          price,
          products (
            name,
            images
          )
        )
      `)
      .eq('id', id)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      console.error('Order fetch error:', orderError);
      return NextResponse.json(
        { error: 'Failed to fetch order', details: orderError.message },
        { status: 500 }
      );
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch customer info from users table
    let customer = { full_name: 'Guest Customer', email: 'N/A', phone: null };
    if (order.user_id) {
      const { data: userData, error: userError } = await adminClient
        .from('users')
        .select('full_name, email, phone')
        .eq('id', order.user_id)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
      } else if (userData) {
        customer = {
          full_name: userData.full_name || 'Guest Customer',
          email: userData.email || 'N/A',
          phone: userData.phone || null,
        };
      }
    }

    // Fetch seller info from employees table
    let seller: string | null = null;
    if (order.seller_id) {
      const { data: employeeData, error: employeeError } = await adminClient
        .from('employees')
        .select('employee_code')
        .eq('id', order.seller_id)
        .single();

      if (employeeError) {
        console.error('Error fetching employee:', employeeError);
      } else if (employeeData) {
        seller = employeeData.employee_code || null;
      }
    }

    // Format order items
    const items = (order.order_items as any[]).map((item: any) => {
      const product = item.products as any;
      const images: string[] = product?.images || [];
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || 'Unknown Product',
        product_image: images.length > 0 ? images[0] : null,
        size: item.size || null,
        color: item.color || null,
        quantity: item.quantity,
        unit_price: parseFloat(item.price ?? '0'),
      };
    });

    return NextResponse.json({
      order: {
        id: order.id,
        order_number: formatOrderId(order.id),
        date: order.created_at,
        status: order.status || 'pending',
        payment_method: order.payment_method || 'N/A',
        sale_type: order.sale_type || 'online',
        total_amount: parseFloat(order.total_amount ?? '0'),
        customer,
        seller,
        items,
      },
    });
  } catch (error) {
    console.error('Order detail fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
