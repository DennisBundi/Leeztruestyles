# Payment Callback Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After Paystack payment, redirect users back to the site, verify payment, clear cart, and show success page.

**Architecture:** Add `callback_url` to Paystack initialize requests pointing to a new `/checkout/callback` client page. That page calls a new `/api/payments/verify` route which verifies with Paystack, updates the order, and returns the order ID. The existing webhook remains as a backup. Both paths are idempotent.

**Tech Stack:** Next.js 14 App Router, Paystack API, Zustand (cart store), Supabase

---

### Task 1: Add `callback_url` to PaymentRequest type

**Files:**
- Modify: `src/types/index.ts:85-91`

**Step 1: Add callback_url to PaymentRequest interface**

```typescript
export interface PaymentRequest {
  order_id: string;
  amount: number;
  method: "mpesa" | "card";
  phone?: string;
  email?: string;
  callback_url?: string;
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add callback_url to PaymentRequest type"
```

---

### Task 2: Pass `callback_url` in Paystack initialize requests

**Files:**
- Modify: `src/services/paymentService.ts` (both `initiateMpesaPayment` and `initiateCardPayment`)

**Step 1: Add callback_url to M-Pesa initialize body**

In `initiateMpesaPayment`, add `callback_url` to the JSON body sent to `https://api.paystack.co/transaction/initialize`:

```typescript
body: JSON.stringify({
  email,
  amount: request.amount * 100,
  currency: 'KES',
  channels: ['mobile_money'],
  callback_url: request.callback_url,  // <-- ADD THIS
  reference: `order_${request.order_id}_${Date.now()}`,
  metadata: {
    order_id: request.order_id,
    phone: `+${formattedPhone}`,
    custom_fields: [
      {
        display_name: 'Order ID',
        variable_name: 'order_id',
        value: request.order_id,
      },
    ],
  },
}),
```

**Step 2: Add callback_url to card initialize body**

In `initiateCardPayment`, add `callback_url` to the JSON body:

```typescript
body: JSON.stringify({
  email: request.email!,
  amount: request.amount * 100,
  currency: 'KES',
  callback_url: request.callback_url,  // <-- ADD THIS
  reference: `order_${request.order_id}_${Date.now()}`,
  metadata: {
    order_id: request.order_id,
    custom_fields: [
      {
        display_name: 'Order ID',
        variable_name: 'order_id',
        value: request.order_id,
      },
    ],
  },
}),
```

**Step 3: Commit**

```bash
git add src/services/paymentService.ts
git commit -m "feat: pass callback_url to Paystack initialize requests"
```

---

### Task 3: Pass origin-based callback_url from initiate route

**Files:**
- Modify: `src/app/api/payments/initiate/route.ts`

**Step 1: Build callback_url from request headers and pass to PaymentService**

Before the `PaymentService` calls (around line 102), derive the origin and add `callback_url` to the payment request:

```typescript
// Build callback URL from request origin
const origin = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'http://localhost:3000';
const callbackUrl = `${origin}/checkout/callback`;

// Initiate payment
const paymentRequest: PaymentRequest = {
  order_id: validated.order_id,
  amount: validated.amount,
  method: validated.method,
  phone: validated.phone,
  email: validated.email,
  callback_url: callbackUrl,
};
```

**Step 2: Commit**

```bash
git add src/app/api/payments/initiate/route.ts
git commit -m "feat: derive callback_url from request origin in initiate route"
```

---

### Task 4: Create payment verify API route

**Files:**
- Create: `src/app/api/payments/verify/route.ts`

**Step 1: Create the verify route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/paymentService';
import { InventoryService } from '@/services/inventoryService';
import { LoyaltyService } from '@/services/loyaltyService';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
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
        { success: false, error: 'Payment not confirmed', status: verification.status },
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

    // Idempotency: if already completed, just return success
    if (order.status === 'completed') {
      return NextResponse.json({ success: true, order_id: order.id });
    }

    // Update order status to completed
    await adminClient
      .from('orders')
      .update({ status: 'completed' })
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
          }
        }
      }
    } catch (loyaltyError) {
      logger.error('Error awarding loyalty points:', loyaltyError);
    }

    return NextResponse.json({ success: true, order_id: order.id });
  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/payments/verify/route.ts
git commit -m "feat: add payment verify API route"
```

---

### Task 5: Add idempotency guard to existing Paystack webhook

**Files:**
- Modify: `src/app/api/payments/paystack/route.ts`

**Step 1: Add early return if order already completed**

After fetching the order in the `charge.success` handler (around line 47), before reconciliation, add a check. Insert after `const orderId = metadata.order_id;`:

```typescript
// Idempotency: skip if already completed (verify route may have processed first)
const adminClient = createAdminClient();
const { data: existingOrder } = await adminClient
  .from('orders')
  .select('status')
  .eq('id', orderId)
  .single();

if (existingOrder?.status === 'completed') {
  return NextResponse.json({ success: true, message: 'Already processed' });
}
```

**Step 2: Commit**

```bash
git add src/app/api/payments/paystack/route.ts
git commit -m "feat: add idempotency guard to Paystack webhook"
```

---

### Task 6: Create checkout callback page

**Files:**
- Create: `src/app/(marketplace)/checkout/callback/page.tsx`

**Step 1: Create the client-side callback page**

```tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      setStatus('failed');
      setError('No payment reference found. Please contact support.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
        const data = await response.json();

        if (data.success && data.order_id) {
          setStatus('success');
          clearCart();
          router.push(`/checkout/success?order_id=${data.order_id}`);
        } else {
          setStatus('failed');
          setError(data.error || 'Payment verification failed. If you were charged, please contact support.');
        }
      } catch (err) {
        setStatus('failed');
        setError('Could not verify payment. If you were charged, please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, router, clearCart]);

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Verifying your payment...</h1>
        <p className="text-gray-600">Please wait while we confirm your payment. Do not close this page.</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/checkout"
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
          >
            Try Again
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-primary hover:text-primary transition-all"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  // Success state — user is being redirected, show brief loading
  return (
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <h1 className="text-2xl font-bold mb-2">Payment confirmed!</h1>
      <p className="text-gray-600">Redirecting to your order summary...</p>
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24 min-h-[60vh] flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-600">Loading...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(marketplace)/checkout/callback/page.tsx
git commit -m "feat: add checkout callback page for post-payment redirect"
```

---

### Task 7: Test the full flow end-to-end

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Manual test**

1. Add product to cart
2. Go to checkout, fill details, click Pay
3. Verify redirect to Paystack hosted page
4. Complete payment on Paystack
5. Verify redirect back to `/checkout/callback?reference=xxx`
6. Verify spinner shows "Verifying your payment..."
7. Verify redirect to `/checkout/success?order_id=xxx`
8. Verify cart is empty
9. Verify order status is `completed` in Supabase

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete payment callback flow with Paystack redirect"
```
