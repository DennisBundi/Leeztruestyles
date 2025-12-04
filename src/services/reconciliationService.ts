import { createClient } from '@/lib/supabase/server';
import { PaymentService } from './paymentService';

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
}

