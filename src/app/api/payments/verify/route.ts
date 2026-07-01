import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
import { PaymentService } from '@/services/paymentService';
import { InventoryService } from '@/services/inventoryService';
import { LoyaltyService } from '@/services/loyaltyService';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendOrderConfirmation, sendInvoiceEmail, sendReferralRewardEmail } from '@/lib/email/service'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const reference = request.nextUrl.searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Missing payment reference' },
        { status: 400 }
      );
    }

    // Verify with Paystack
    const verification = await PaymentService.verifyPayment(reference);

    if (!verification.success || verification.status !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Payment not confirmed' },
        { status: 400 }
      );
    }

    // Find order by payment reference
    const adminClient = createAdminClient();
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, status, user_id, total_amount')
      .eq('payment_reference', reference)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found for this payment' },
        { status: 404 }
      );
    }

    // Verify the authenticated user owns this order
    if (order.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Order not found for this payment' },
        { status: 404 }
      );
    }

    // Idempotency: if already completed, just return success
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, order_id: order.id });
    }

    // Update order status to paid
    await adminClient
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id);

    // Deduct inventory
    const { data: orderItems } = await adminClient
      .from('order_items')
      .select('product_id, quantity, size, color')
      .eq('order_id', order.id);

    if (orderItems) {
      for (const item of orderItems) {
        try {
          await InventoryService.deductStock(
            item.product_id,
            item.quantity,
            undefined,
            item.size || undefined,
            item.color || undefined
          );
        } catch (err) {
          logger.error(`Inventory deduction error for product ${item.product_id}:`, err);
        }
      }
    }

    // Award loyalty points
    try {
      if (order.user_id) {
        const pointsAwarded = await LoyaltyService.awardPurchasePoints(
          order.user_id,
          order.id,
          order.total_amount
        );
        if (pointsAwarded > 0) {
          logger.info(`Awarded ${pointsAwarded} loyalty points for order ${order.id}`);
        }

        // Check and complete any pending referral
        const { data: pendingReferral } = await adminClient
          .from('referrals')
          .select('id, referrer_id')
          .eq('referred_id', order.user_id)
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
            logger.info(`Awarded ${referralPoints} referral points for order ${order.id}`);
            const { data: referredUser } = await adminClient.from('users').select('full_name').eq('id', order.user_id).single()
            const firstName = ((referredUser as any)?.full_name ?? 'Someone').split(' ')[0]
            await sendReferralRewardEmail(pendingReferral.referrer_id, firstName, referralPoints)
          }
        }
      }
    } catch (loyaltyError) {
      logger.error('Error awarding loyalty points:', loyaltyError);
    }

    await sendOrderConfirmation(order.id, user.email ?? undefined)
    await sendInvoiceEmail(order.id, user.email ?? undefined)
    return NextResponse.json({ success: true, order_id: order.id });
  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
