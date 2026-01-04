import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DarajaService } from '@/services/darajaService';
import { z } from 'zod';

const statusRequestSchema = z.object({
  order_id: z.string().uuid().optional(),
  checkout_request_id: z.string().optional(),
}).refine(
  (data) => data.order_id || data.checkout_request_id,
  { message: 'Either order_id or checkout_request_id is required' }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = statusRequestSchema.parse(body);

    const supabase = await createClient();

    let order;
    let checkoutRequestID: string;

    // Find order by order_id or checkout_request_id
    if (validated.order_id) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', validated.order_id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      order = data;
      checkoutRequestID = order.payment_reference || '';
    } else if (validated.checkout_request_id) {
      checkoutRequestID = validated.checkout_request_id;
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_reference', checkoutRequestID)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Order not found for checkout request ID' },
          { status: 404 }
        );
      }

      order = data;
    } else {
      return NextResponse.json(
        { error: 'Either order_id or checkout_request_id is required' },
        { status: 400 }
      );
    }

    // Check if payment method is M-Pesa
    if (order.payment_method !== 'mpesa') {
      return NextResponse.json(
        { error: 'This endpoint only supports M-Pesa payments' },
        { status: 400 }
      );
    }

    // If order is already completed or failed, return current status
    if (order.status === 'completed') {
      return NextResponse.json({
        status: 'success',
        order_status: 'completed',
        message: 'Payment completed successfully',
      });
    }

    if (order.status === 'failed' || order.status === 'cancelled') {
      return NextResponse.json({
        status: 'failed',
        order_status: order.status,
        message: 'Payment failed or was cancelled',
      });
    }

    // Query M-Pesa payment status
    if (!checkoutRequestID) {
      return NextResponse.json(
        { error: 'Checkout request ID not found for this order' },
        { status: 400 }
      );
    }

    const queryResult = await DarajaService.querySTKStatus(checkoutRequestID);

    if (!queryResult.success) {
      return NextResponse.json(
        { 
          error: queryResult.error || 'Failed to query payment status',
          status: 'error',
        },
        { status: 500 }
      );
    }

    // Map Daraja status to our status
    let orderStatus = order.status;
    if (queryResult.status === 'success' && order.status !== 'completed') {
      // Payment completed, update order
      await supabase
        .from('orders')
        .update({
          status: 'completed',
          payment_reference: queryResult.receiptNumber || checkoutRequestID,
        })
        .eq('id', order.id);

      orderStatus = 'completed';
    } else if (queryResult.status === 'failed' || queryResult.status === 'cancelled') {
      if (order.status !== 'failed') {
        await supabase
          .from('orders')
          .update({
            status: 'failed',
          })
          .eq('id', order.id);
        orderStatus = 'failed';
      }
    }

    return NextResponse.json({
      status: queryResult.status || 'pending',
      order_status: orderStatus,
      message: queryResult.message,
      receipt_number: queryResult.receiptNumber,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}


