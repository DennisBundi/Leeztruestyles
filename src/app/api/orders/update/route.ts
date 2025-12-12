import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateOrderSchema = z.object({
  order_id: z.string().uuid(),
  seller_id: z.string().uuid().optional(),
  payment_method: z.enum(['mpesa', 'card', 'cash']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'refunded']).optional(),
  social_platform: z.enum(['tiktok', 'instagram', 'whatsapp', 'walkin']).optional(),
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
    
    // Log the request for debugging
    console.log('Order update request:', {
      order_id: body.order_id,
      seller_id: body.seller_id,
      payment_method: body.payment_method,
      status: body.status,
      social_platform: body.social_platform,
    });
    
    // Clean up the body - remove undefined/null seller_id
    if (body.seller_id === null || body.seller_id === undefined || body.seller_id === '') {
      delete body.seller_id;
    }
    
    const validated = updateOrderSchema.parse(body);

    const updateData: any = {};
    if (validated.seller_id !== undefined) updateData.seller_id = validated.seller_id;
    if (validated.payment_method !== undefined) updateData.payment_method = validated.payment_method;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.social_platform !== undefined) updateData.social_platform = validated.social_platform;

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', validated.order_id);

    // If error is about missing social_platform column, log warning but don't fail
    if (error && error.message && error.message.includes("social_platform")) {
      console.warn("⚠️ Social platform column not found. Please run migration: add_social_platform_to_orders.sql");
      // Remove social_platform from update and retry
      if (updateData.social_platform) {
        delete updateData.social_platform;
        const { error: retryError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', validated.order_id);
        if (retryError) {
          console.error('Order update error:', retryError);
          return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true, warning: 'Social platform column not found, order updated without it' });
      }
    }

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
      console.error('Validation error:', error.errors);
      // Format validation errors for better readability
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
        received: err.path.length > 0 ? (body as any)[err.path[0]] : undefined,
      }));
      
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: formattedErrors,
          rawErrors: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Order update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

