import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaymentService } from '@/services/paymentService';
import { InventoryService } from '@/services/inventoryService';
import { rateLimit } from '@/lib/rateLimit';
import type { PaymentRequest } from '@/types';
import { z } from 'zod';

const paymentRequestSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['mpesa', 'card']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
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

    const body = await request.json();
    console.log('Payment initiate request body:', JSON.stringify(body, null, 2));
    
    let validated;
    try {
      validated = paymentRequestSchema.parse(body);
    } catch (error) {
      console.error('Validation error:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    // Validate required fields based on payment method
    if (validated.method === 'mpesa' && !validated.phone) {
      console.error('M-Pesa payment missing phone number');
      return NextResponse.json(
        { error: 'Phone number required for M-Pesa payment' },
        { status: 400 }
      );
    }
    
    console.log('Validated payment request:', {
      order_id: validated.order_id,
      amount: validated.amount,
      method: validated.method,
      hasPhone: !!validated.phone,
      hasEmail: !!validated.email,
    });

    if (validated.method === 'card' && !validated.email) {
      return NextResponse.json(
        { error: 'Email required for card payment' },
        { status: 400 }
      );
    }

    // Verify order exists and is pending
    const supabase = await createClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', validated.order_id)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json(
        { error: 'Order not found', details: orderError?.message },
        { status: 404 }
      );
    }

    console.log('Order found:', { id: order.id, status: order.status, total_amount: order.total_amount });

    if (order.status !== 'pending') {
      console.error('Order is not pending:', order.status);
      return NextResponse.json(
        { error: 'Order is not pending payment', currentStatus: order.status },
        { status: 400 }
      );
    }

    // Reserve inventory for pending payment
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', validated.order_id);

    if (orderItems) {
      for (const item of orderItems) {
        const reserved = await InventoryService.reserveStock(
          item.product_id,
          item.quantity
        );
        if (!reserved) {
          return NextResponse.json(
            { error: `Insufficient stock for product ${item.product_id}` },
            { status: 400 }
          );
        }
      }
    }

    // Initiate payment
    const paymentRequest: PaymentRequest = {
      order_id: validated.order_id,
      amount: validated.amount,
      method: validated.method,
      phone: validated.phone,
      email: validated.email,
    };

    let paymentResponse;

    console.log('Initiating payment with method:', validated.method);
    
    if (validated.method === 'mpesa') {
      paymentResponse = await PaymentService.initiateMpesaPayment(paymentRequest);
    } else {
      paymentResponse = await PaymentService.initiateCardPayment(paymentRequest);
    }

    console.log('Payment response:', { success: paymentResponse.success, error: paymentResponse.error });

    if (!paymentResponse.success) {
      console.error('Payment initiation failed:', paymentResponse.error);
      // Release reserved inventory on payment failure
      if (orderItems) {
        for (const item of orderItems) {
          await InventoryService.releaseStock(item.product_id, item.quantity);
        }
      }
      return NextResponse.json(
        { error: paymentResponse.error || 'Payment initiation failed' },
        { status: 400 }
      );
    }

    // Update order with payment reference
    await supabase
      .from('orders')
      .update({
        payment_reference: paymentResponse.reference,
        payment_method: validated.method,
        status: 'processing',
      })
      .eq('id', validated.order_id);

    return NextResponse.json({
      success: true,
      reference: paymentResponse.reference,
      authorization_url: paymentResponse.authorization_url,
      message: paymentResponse.message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}

