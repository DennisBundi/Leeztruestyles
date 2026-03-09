import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReconciliationService } from '@/services/reconciliationService';
import { InventoryService } from '@/services/inventoryService';
import { LoyaltyService } from '@/services/loyaltyService';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac } from 'crypto';
import { logger } from '@/lib/logger';

function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;

  const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!verifyPaystackSignature(rawBody, signature)) {
      logger.warn('Paystack webhook: invalid or missing signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse JSON only after signature is verified
    const body = JSON.parse(rawBody);
    const { event, data } = body;

    if (event === 'charge.success') {
      const reference = data.reference;
      const metadata = data.metadata;

      if (!metadata?.order_id) {
        return NextResponse.json(
          { error: 'Order ID not found in metadata' },
          { status: 400 }
        );
      }

      const orderId = metadata.order_id;

      // Idempotency: skip if already completed (verify route may have processed first)
      const checkClient = createAdminClient();
      const { data: existingOrder } = await checkClient
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (existingOrder?.status === 'completed') {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      // Reconcile the transaction
      const reconciled = await ReconciliationService.reconcileTransaction(
        reference,
        orderId
      );

      if (!reconciled) {
        return NextResponse.json(
          { error: 'Failed to reconcile transaction' },
          { status: 500 }
        );
      }

      // Deduct inventory for completed order
      const supabase = await createClient();
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (orderItems) {
        for (const item of orderItems) {
          await InventoryService.deductStock(item.product_id, item.quantity);
        }
      }

      // Award loyalty points for purchase
      try {
        const adminClient = createAdminClient();
        const { data: completedOrder } = await adminClient
          .from('orders')
          .select('user_id, total_amount')
          .eq('id', orderId)
          .single();

        if (completedOrder?.user_id) {
          const pointsAwarded = await LoyaltyService.awardPurchasePoints(
            completedOrder.user_id,
            orderId,
            completedOrder.total_amount
          );
          if (pointsAwarded > 0) {
            logger.info(`Awarded ${pointsAwarded} loyalty points for order ${orderId}`);
          }

          // Check and complete any pending referral for this user
          const { data: pendingReferral } = await adminClient
            .from('referrals')
            .select('id, referrer_id')
            .eq('referred_id', completedOrder.user_id)
            .eq('status', 'pending')
            .single();

          if (pendingReferral) {
            await adminClient
              .from('referrals')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('id', pendingReferral.id);

            const referralPoints = await LoyaltyService.awardReferralPoints(
              pendingReferral.referrer_id,
              pendingReferral.id
            );
            if (referralPoints > 0) {
              logger.info(`Awarded ${referralPoints} referral points to referrer for order ${orderId}`);
            }
          }
        }
      } catch (loyaltyError) {
        logger.error('Error awarding loyalty points:', loyaltyError);
      }

      return NextResponse.json({ success: true });
    }

    if (event === 'charge.failed') {
      const reference = data.reference;
      const supabase = await createClient();

      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('provider_reference', reference);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Paystack webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
