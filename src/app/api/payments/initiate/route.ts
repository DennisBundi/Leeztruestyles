import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaymentService } from '@/services/paymentService';
import { InventoryService } from '@/services/inventoryService';
import { rateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import type { PaymentRequest } from '@/types';
import { z } from 'zod';

const paymentRequestSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['mpesa', 'card']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  customer_name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`payment:${clientIp}`, 5, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    let validated;
    try {
      validated = paymentRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data' },
          { status: 400 }
        );
      }
      throw error;
    }

    // Validate required fields based on payment method
    if (validated.method === 'mpesa' && !validated.phone) {
      return NextResponse.json(
        { error: 'Phone number required for M-Pesa payment' },
        { status: 400 }
      );
    }

    if (validated.method === 'card' && !validated.email) {
      return NextResponse.json(
        { error: 'Email required for card payment' },
        { status: 400 }
      );
    }

    // Verify order exists and is pending
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, user_id, total_amount')
      .eq('id', validated.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify the authenticated user owns this order
    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not pending payment' },
        { status: 400 }
      );
    }

    // Verify the submitted amount matches the order total
    if (validated.amount !== order.total_amount) {
      return NextResponse.json(
        { error: 'Payment amount does not match order total' },
        { status: 400 }
      );
    }

    // Check stock availability (don't reserve — avoids reservation leaks from abandoned payments)
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', validated.order_id);

    if (orderItems) {
      // Check all items in parallel instead of sequentially
      const stockChecks = await Promise.all(
        orderItems.map((item) => InventoryService.getStock(item.product_id))
      );
      for (let i = 0; i < orderItems.length; i++) {
        if (stockChecks[i] < orderItems[i].quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for one of your items. Please refresh and try again.` },
            { status: 400 }
          );
        }
      }
    }

    // Derive callback URL so Paystack redirects users back after payment
    const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'http://localhost:3000';
    const callbackUrl = `${origin}/checkout/callback`;

    // Initiate payment
    const paymentRequest: PaymentRequest = {
      order_id: validated.order_id,
      amount: validated.amount,
      method: validated.method,
      phone: validated.phone,
      email: validated.email,
      customer_name: validated.customer_name,
      callback_url: callbackUrl,
    };

    let paymentResponse;

    if (validated.method === 'mpesa') {
      if (!validated.phone) {
        return NextResponse.json(
          { error: 'Phone number is required for M-Pesa payment' },
          { status: 400 }
        );
      }

      paymentResponse = await PaymentService.initiateMpesaPayment(paymentRequest);

      if (!paymentResponse.success) {
        logger.error('M-Pesa payment initiation failed for order:', validated.order_id);
      }
    } else {
      paymentResponse = await PaymentService.initiateCardPayment(paymentRequest);
    }

    if (!paymentResponse.success) {
      logger.error('Payment initiation failed:', paymentResponse.error);
      return NextResponse.json(
        { error: paymentResponse.error || 'Payment initiation failed' },
        { status: 400 }
      );
    }

    // Update order with payment reference (use admin client to bypass RLS)
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        payment_reference: paymentResponse.reference,
        payment_method: validated.method,
        status: 'processing',
      })
      .eq('id', validated.order_id);

    if (updateError) {
      logger.error('Failed to update order with payment reference:', updateError);
    }

    return NextResponse.json({
      success: true,
      reference: paymentResponse.reference,
      access_code: paymentResponse.access_code,
      authorization_url: paymentResponse.authorization_url,
      message: paymentResponse.message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    logger.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
