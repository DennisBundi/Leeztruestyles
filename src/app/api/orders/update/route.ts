import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

const updateOrderSchema = z.object({
  order_id: z.string().uuid(),
  seller_id: z.string().uuid().optional(),
  payment_method: z.enum(['mpesa', 'card', 'cash']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'refunded']).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateOrderSchema.parse(body);

    const updateData: any = {};
    if (validated.seller_id !== undefined) updateData.seller_id = validated.seller_id;
    if (validated.payment_method !== undefined) updateData.payment_method = validated.payment_method;
    if (validated.status !== undefined) updateData.status = validated.status;

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', validated.order_id);

    if (error) {
      console.error('Order update error:', error);
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Order update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

