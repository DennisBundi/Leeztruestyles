# Payment Callback Flow Design

## Problem

After completing payment on Paystack's hosted checkout page, users are stuck with no redirect back to the site. The cart is not cleared and the success page is never shown.

## Root Cause

The `transaction/initialize` calls to Paystack do not include a `callback_url`, so Paystack has nowhere to send the user after payment.

## Design

### 1. Add `callback_url` to Paystack initialize requests

Both `initiateMpesaPayment` and `initiateCardPayment` in `paymentService.ts` pass `callback_url` to Paystack. The URL points to `/checkout/callback` on the current origin. The origin is passed from the API route via the request's host/origin header.

### 2. New client page: `/checkout/callback`

Location: `src/app/(marketplace)/checkout/callback/page.tsx`

- Reads `reference` and `trxref` from URL query params (Paystack appends these)
- Shows a "Verifying your payment..." spinner
- Calls `GET /api/payments/verify?reference=xxx`
- On success: clears cart via Zustand store, redirects to `/checkout/success?order_id=xxx`
- On failure: shows error message with retry and contact support options

### 3. New API route: `GET /api/payments/verify`

Location: `src/app/api/payments/verify/route.ts`

- Accepts `reference` query param
- Calls `PaymentService.verifyPayment(reference)` (already exists)
- Looks up the order by `payment_reference`
- If order is already completed, returns success immediately (idempotency)
- If payment verified: updates order to `completed`, deducts inventory, awards loyalty points
- Returns `{ success: true, order_id }` or `{ success: false, error }`

### 4. Webhook remains as backup

The existing `/api/payments/paystack` webhook is unchanged. It handles the case where the user closes the browser before the callback page finishes verification. Both paths check if the order is already completed before processing (idempotent).

### 5. Idempotency

Both verify route and webhook check `order.status !== 'completed'` before processing inventory deduction and loyalty points, preventing double-processing.

## Files Changed

- `src/services/paymentService.ts` — add `callback_url` param to both initialize calls
- `src/app/api/payments/initiate/route.ts` — pass origin to payment service
- `src/app/(marketplace)/checkout/callback/page.tsx` — new client page
- `src/app/api/payments/verify/route.ts` — new API route
