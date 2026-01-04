import { createClient } from '@/lib/supabase/server';
import { PaymentService } from './paymentService';
import { DarajaService } from './darajaService';

export class ReconciliationService {
  /**
   * Match Paystack transaction with order
   */
  static async reconcileTransaction(
    providerReference: string,
    orderId: string
  ): Promise<boolean> {
    const supabase = await createClient();

    // Verify payment with Paystack
    const verification = await PaymentService.verifyPayment(providerReference);

    if (!verification.success) {
      return false;
    }

    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_reference: providerReference,
      })
      .eq('id', orderId);

    if (orderError) {
      console.error('Order update error:', orderError);
      return false;
    }

    // Create or update transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .upsert({
        order_id: orderId,
        payment_provider: 'paystack',
        provider_reference: providerReference,
        amount: verification.data?.amount ? verification.data.amount / 100 : 0,
        status: 'success',
        metadata: verification.data,
      });

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
      return false;
    }

    return true;
  }

  /**
   * Get all transactions for reconciliation
   */
  static async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentMethod?: string;
  }) {
    const supabase = await createClient();

    let query = supabase
      .from('transactions')
      .select('*, orders(*)')
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Transaction fetch error:', error);
      return [];
    }

    return data;
  }

  /**
   * Reconcile M-Pesa transaction
   * Can be called from callback webhook or manual query
   */
  static async reconcileMpesaTransaction(
    checkoutRequestID: string,
    orderId?: string
  ): Promise<boolean> {
    const supabase = await createClient();

    // If orderId not provided, find order by payment_reference
    let order;
    if (orderId) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        console.error('Order not found:', orderId);
        return false;
      }
      order = data;
    } else {
      // Find order by payment_reference (CheckoutRequestID)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_reference', checkoutRequestID)
        .single();
      
      if (error || !data) {
        console.error('Order not found for CheckoutRequestID:', checkoutRequestID);
        return false;
      }
      order = data;
    }

    // Query payment status from Daraja
    const queryResult = await DarajaService.querySTKStatus(checkoutRequestID);

    if (!queryResult.success) {
      console.error('Failed to query M-Pesa status:', queryResult.error);
      return false;
    }

    // Handle different payment statuses
    if (queryResult.status === 'success') {
      // Payment successful
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          payment_reference: queryResult.receiptNumber || checkoutRequestID,
        })
        .eq('id', order.id);

      if (orderError) {
        console.error('Order update error:', orderError);
        return false;
      }

      // Create or update transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .upsert({
          order_id: order.id,
          payment_provider: 'mpesa',
          provider_reference: queryResult.receiptNumber || checkoutRequestID,
          amount: order.total_amount,
          status: 'success',
          metadata: {
            checkoutRequestID,
            receiptNumber: queryResult.receiptNumber,
            message: queryResult.message,
          },
        });

      if (transactionError) {
        console.error('Transaction record error:', transactionError);
        return false;
      }

      return true;
    } else if (queryResult.status === 'cancelled' || queryResult.status === 'failed') {
      // Payment failed or cancelled
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
          provider_reference: checkoutRequestID,
          amount: order.total_amount,
          status: 'failed',
          metadata: {
            checkoutRequestID,
            status: queryResult.status,
            message: queryResult.message,
          },
        });

      return false;
    } else {
      // Still pending
      console.log('Payment still pending for order:', order.id);
      return false;
    }
  }
}

