import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InventoryService } from '@/services/inventoryService';

export const dynamic = 'force-dynamic';

interface MpesaCallbackPayload {
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
    const body: MpesaCallbackPayload = await request.json();
    
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

    // Extract callback data
    const stkCallback = body.Body?.stkCallback;
    
    if (!stkCallback) {
      console.error('Invalid callback structure:', body);
      return NextResponse.json(
        { error: 'Invalid callback structure' },
        { status: 400 }
      );
    }

    const {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    console.log('Processing callback:', {
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    });

    // Find order by CheckoutRequestID (stored in payment_reference field)
    const adminClient = createAdminClient();
    const { data: orders, error: orderError } = await adminClient
      .from('orders')
      .select('id, status, total_amount, payment_reference')
      .eq('payment_reference', CheckoutRequestID)
      .limit(1);

    if (orderError || !orders || orders.length === 0) {
      console.error('Order not found for CheckoutRequestID:', CheckoutRequestID, orderError);
      // Still return success to M-Pesa to acknowledge receipt
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }

    const order = orders[0];

    // Handle duplicate callbacks (idempotency)
    if (order.status === 'completed' && ResultCode === 0) {
      console.log('Order already completed, ignoring duplicate callback:', order.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    // Process based on ResultCode
    if (ResultCode === 0) {
      // Payment successful
      console.log('Payment successful for order:', order.id);

      // Extract transaction details from CallbackMetadata
      let mpesaReceiptNumber: string | null = null;
      let transactionDate: string | null = null;
      let phoneNumber: string | null = null;
      let amount: number = order.total_amount;

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          switch (item.Name) {
            case 'Amount':
              amount = typeof item.Value === 'number' ? item.Value : parseFloat(String(item.Value));
              break;
            case 'MpesaReceiptNumber':
              mpesaReceiptNumber = String(item.Value);
              break;
            case 'TransactionDate':
              transactionDate = String(item.Value);
              break;
            case 'PhoneNumber':
              phoneNumber = String(item.Value);
              break;
          }
        }
      }

      // Update order status to completed
      const { error: updateError } = await adminClient
        .from('orders')
        .update({
          status: 'completed',
          payment_reference: mpesaReceiptNumber || CheckoutRequestID, // Store M-Pesa receipt number
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Callback received but order update failed' });
      }

      // Get order items to deduct inventory
      const { data: orderItems, error: itemsError } = await adminClient
        .from('order_items')
        .select('product_id, quantity, size, color')
        .eq('order_id', order.id);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      } else if (orderItems) {
        // Deduct inventory for each item
        for (const item of orderItems) {
          try {
            await InventoryService.deductStock(
              item.product_id,
              item.quantity,
              undefined, // sellerId not needed for online orders
              item.size || undefined,
              item.color || undefined
            );
            console.log(`Deducted ${item.quantity} from product ${item.product_id}`);
          } catch (error) {
            console.error(`Error deducting inventory for product ${item.product_id}:`, error);
            // Continue with other items even if one fails
          }
        }
      }

      // Create transaction record
      await adminClient
        .from('transactions')
        .upsert({
          order_id: order.id,
          payment_provider: 'mpesa',
          provider_reference: mpesaReceiptNumber || CheckoutRequestID,
          amount: amount,
          status: 'success',
          metadata: {
            CheckoutRequestID,
            MerchantRequestID: stkCallback.MerchantRequestID,
            TransactionDate: transactionDate,
            PhoneNumber: phoneNumber,
            ResultCode,
            ResultDesc,
          },
        }, {
          onConflict: 'provider_reference',
        });

      console.log('Order completed successfully:', order.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
    } else {
      // Payment failed or cancelled
      console.log('Payment failed for order:', order.id, 'Reason:', ResultDesc);

      // Update order status based on error
      let orderStatus = 'pending'; // Default to pending for retry
      
      // Common error codes from Daraja documentation
      if (ResultCode === 1032) {
        // Request cancelled by user
        orderStatus = 'cancelled';
      } else if (ResultCode === 1037) {
        // Timeout waiting for customer input
        orderStatus = 'pending'; // Can retry
      } else {
        // Other errors - keep as pending for potential retry
        orderStatus = 'pending';
      }

      const { error: updateError } = await adminClient
        .from('orders')
        .update({
          status: orderStatus,
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Error updating order status:', updateError);
      }

      // Release reserved inventory
      const { data: orderItems } = await adminClient
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id);

      if (orderItems) {
        for (const item of orderItems) {
          try {
            await InventoryService.releaseStock(item.product_id, item.quantity);
            console.log(`Released ${item.quantity} reserved stock for product ${item.product_id}`);
          } catch (error) {
            console.error(`Error releasing inventory for product ${item.product_id}:`, error);
          }
        }
      }

      // Create transaction record for failed payment
      await adminClient
        .from('transactions')
        .upsert({
          order_id: order.id,
          payment_provider: 'mpesa',
          provider_reference: CheckoutRequestID,
          amount: order.total_amount,
          status: 'failed',
          metadata: {
            CheckoutRequestID,
            MerchantRequestID: stkCallback.MerchantRequestID,
            ResultCode,
            ResultDesc,
          },
        }, {
          onConflict: 'provider_reference',
        });

      // Always return success to M-Pesa to acknowledge receipt
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    // Always return success to M-Pesa to acknowledge receipt
    // We'll handle errors internally
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Callback received' });
  }
}
