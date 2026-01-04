import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InventoryService } from '@/services/inventoryService';

interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MpesaCallbackBody = await request.json();

    // Extract callback data
    const stkCallback = body.Body?.stkCallback;
    if (!stkCallback) {
      console.error('Invalid M-Pesa callback format:', body);
      return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 });
    }

    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    console.log('M-Pesa Callback Received:', {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    });

    const supabase = await createClient();

    // Find order by payment_reference (CheckoutRequestID)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_reference', CheckoutRequestID)
      .single();

    if (orderError || !order) {
      console.error('Order not found for CheckoutRequestID:', CheckoutRequestID);
      // Still return 200 to prevent Safaricom from retrying
      return NextResponse.json({ received: true, error: 'Order not found' });
    }

    // Extract transaction details from callback metadata
    let mpesaReceiptNumber: string | null = null;
    let transactionDate: string | null = null;
    let phoneNumber: string | null = null;
    let amount: number | null = null;

    if (CallbackMetadata?.Item) {
      CallbackMetadata.Item.forEach((item) => {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = String(item.Value);
            break;
          case 'TransactionDate':
            transactionDate = String(item.Value);
            break;
          case 'PhoneNumber':
            phoneNumber = String(item.Value);
            break;
          case 'Amount':
            amount = typeof item.Value === 'number' ? item.Value : parseFloat(String(item.Value));
            break;
        }
      });
    }

    // Handle payment result
    if (ResultCode === 0) {
      // Payment successful
      console.log('M-Pesa Payment Successful:', {
        orderId: order.id,
        CheckoutRequestID,
        mpesaReceiptNumber,
        amount,
      });

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          payment_reference: mpesaReceiptNumber || CheckoutRequestID,
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json({ received: true, error: 'Failed to update order' });
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .upsert({
          order_id: order.id,
          payment_provider: 'mpesa',
          provider_reference: mpesaReceiptNumber || CheckoutRequestID,
          amount: amount || order.total_amount,
          status: 'success',
          metadata: {
            CheckoutRequestID,
            mpesaReceiptNumber,
            transactionDate,
            phoneNumber,
            ResultCode,
            ResultDesc,
          },
        });

      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
      }

      // Deduct inventory for completed order
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id);

      if (orderItems) {
        for (const item of orderItems) {
          await InventoryService.deductStock(item.product_id, item.quantity);
        }
      }

      return NextResponse.json({ 
        ResultCode: 0,
        ResultDesc: 'Accepted',
        message: 'Payment processed successfully'
      });
    } else {
      // Payment failed or cancelled
      console.log('M-Pesa Payment Failed:', {
        orderId: order.id,
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
      });

      // Update order status to failed
      await supabase
        .from('orders')
        .update({
          status: 'failed',
        })
        .eq('id', order.id);

      // Create transaction record for failed payment
      await supabase
        .from('transactions')
        .upsert({
          order_id: order.id,
          payment_provider: 'mpesa',
          provider_reference: CheckoutRequestID,
          amount: order.total_amount,
          status: 'failed',
          metadata: {
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
          },
        });

      // Release reserved inventory
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id);

      if (orderItems) {
        for (const item of orderItems) {
          await InventoryService.releaseStock(item.product_id, item.quantity);
        }
      }

      return NextResponse.json({ 
        ResultCode: 0,
        ResultDesc: 'Accepted',
        message: 'Payment failure recorded'
      });
    }
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    // Always return 200 to prevent Safaricom from retrying
    // Log the error for investigation
    return NextResponse.json({ 
      ResultCode: 0,
      ResultDesc: 'Accepted',
      error: 'Callback processing error'
    });
  }
}


