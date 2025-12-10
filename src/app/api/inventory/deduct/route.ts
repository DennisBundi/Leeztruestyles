import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InventoryService } from '@/services/inventoryService';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const deductRequestSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive().int(),
  order_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has seller role or higher
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'seller')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = deductRequestSchema.parse(body);

    // Get employee record for seller tracking
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Deduct stock atomically
    const success = await InventoryService.deductStock(
      validated.product_id,
      validated.quantity,
      employee?.id
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deduct stock. Insufficient inventory.' },
        { status: 400 }
      );
    }

    // If order_id is provided, update the order with seller_id
    if (validated.order_id && employee) {
      await supabase
        .from('orders')
        .update({ seller_id: employee.id })
        .eq('id', validated.order_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Stock deducted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Inventory deduction error:', error);
    return NextResponse.json(
      { error: 'Failed to deduct stock' },
      { status: 500 }
    );
  }
}

