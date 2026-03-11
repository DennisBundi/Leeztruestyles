import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatOrderId } from '@/lib/utils/orderId';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        payment_method,
        created_at,
        order_items (
          id,
          product_id,
          quantity,
          price,
          size,
          color,
          products (
            name,
            images
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Customer orders fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const formatted = (orders ?? []).map((order: any) => ({
      id: order.id,
      order_number: formatOrderId(order.id),
      date: order.created_at,
      status: order.status,
      payment_method: order.payment_method ?? 'N/A',
      total_amount: Number(order.total_amount ?? 0),
      items: (order.order_items ?? []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name ?? 'Unknown Product',
        product_image: item.products?.images?.[0] ?? null,
        size: item.size ?? null,
        color: item.color ?? null,
        quantity: item.quantity,
        unit_price: Number(item.price ?? 0),
      })),
    }));

    return NextResponse.json({ orders: formatted });
  } catch (error) {
    console.error('Customer orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
