# Email Notifications — Design Spec

**Date:** 2026-06-29
**Status:** Approved

## Overview

Integrate Resend to send transactional emails for order lifecycle events. Emails go to both the customer (if email is available) and the store inbox. Email failures are non-blocking — the order is already saved, so a failed email never breaks an API response.

## Prerequisites

1. Verify the domain `leeztruestyles.com` in the Resend dashboard (resend.com → Domains → Add Domain)
2. Add `RESEND_API_KEY=re_R2VVmBdr_HiZfw7md6HS8BpmUGSoq3F2a` to `.env.local` and Vercel environment variables
3. Install: `npm install resend`

## Sender Config

- **From:** `orders@leeztruestyles.com`
- **Reply-To:** `leeztruestyles44@gmail.com`
- **Store BCC/CC:** `leeztruestyles44@gmail.com` (sent as a separate `to` recipient on every email)

## Architecture

### New Files

**`src/lib/email/resend.ts`**
Resend client singleton. Reads `RESEND_API_KEY` from `process.env`. Exported as `resendClient`.

**`src/lib/email/templates.ts`**
Pure functions returning HTML strings. One function per email type:
- `orderConfirmationTemplate(order, items, customerName)` → HTML invoice email
- `deliveryConfirmationTemplate(order, customerName)` → HTML delivery email
- `cancellationTemplate(order, customerName)` → HTML cancellation email

Each template returns a `{ subject: string; html: string }` object.

**`src/lib/email/service.ts`**
Three exported async functions consumed by API routes:
- `sendOrderConfirmation(orderId: string, customerEmail?: string)` 
- `sendDeliveryConfirmation(orderId: string, customerEmail?: string)`
- `sendCancellationEmail(orderId: string, customerEmail?: string)`

Each function:
1. Fetches order + items + product names from Supabase using the service role client
2. Looks up customer name/email from `users` table via `order.user_id` (uses `customerEmail` param as override if provided)
3. Renders the appropriate template
4. Sends to `[customerEmail, 'leeztruestyles44@gmail.com']` — customer email omitted if null/undefined
5. Catches and logs errors without rethrowing

### Modified Files (Trigger Points)

| File | Trigger | Function called |
|------|---------|----------------|
| `src/app/api/payments/paystack/route.ts` | `charge.success` event → status `completed` | `sendOrderConfirmation(orderId, data.customer.email)` |
| `src/app/api/payments/callback/mpesa/route.ts` | ResultCode `0` → status `paid` | `sendOrderConfirmation(orderId)` |
| `src/app/api/payments/verify/route.ts` | verify success → status `paid` | `sendOrderConfirmation(orderId)` |
| `src/app/api/orders/[id]/deliver/route.ts` | status → `delivered` | `sendDeliveryConfirmation(orderId)` |
| `src/app/api/orders/update/route.ts` | new status === `cancelled` | `sendCancellationEmail(orderId)` |

## Email Types

### 1. Order Confirmation + Invoice

**Subject:** `Order Confirmed — #LEE-XXXXX`

**Customer email content:**
- Leeztruestyles header/logo
- "Thank you for your order, [name]!" heading
- Order number + date
- Itemized table: product name | quantity | unit price | subtotal
- Order total
- Payment method (M-Pesa / Card / Cash)
- "We'll notify you when your order is on its way"
- WhatsApp contact link

**Store copy:** Identical email with "New order received" banner at top.

### 2. Delivery Confirmation

**Subject:** `Your order has been delivered — #LEE-XXXXX`

**Customer email content:**
- "Your order has arrived!" heading
- Order number
- Brief item summary (product names only)
- "Thank you for shopping with Leeztruestyles"
- WhatsApp contact link for any issues

**Store copy:** "Order #LEE-XXXXX marked as delivered" with customer name.

### 3. Cancellation

**Subject:** `Order Cancelled — #LEE-XXXXX`

**Customer email content:**
- "Your order has been cancelled" heading
- Order number
- Refund notice: "If you made a payment, your refund will be processed within 3–5 business days"
- WhatsApp contact link for questions

**Store copy:** "Order #LEE-XXXXX has been cancelled" with customer name.

## Customer Email Resolution

Priority order for finding customer email:
1. `customerEmail` parameter passed directly (Paystack provides `data.customer.email`)
2. `users` table lookup via `order.user_id`
3. `null` → silently skip customer email, still send store copy

## Duplicate Email Prevention

The order confirmation is triggered from three routes (Paystack webhook, M-Pesa callback, payment verify). To prevent sending two confirmation emails for the same order:

- Each trigger only calls `sendOrderConfirmation()` **if the status update it just performed actually changed the row** — i.e., only when the DB update transitions status from a non-paid state to `paid`/`completed`
- In practice: check that the Supabase update affected a row where the previous status was `pending` or `processing`. If the status was already `paid`/`completed` (idempotent re-run), skip the email call

## Error Handling

- All `resendClient.emails.send()` calls are wrapped in try/catch
- Errors are logged with `console.error('[email]', error)`
- Errors are never rethrown — email failure does not affect the API response
- No retry logic (Resend handles delivery retries on their side)

## Environment Variables

```
RESEND_API_KEY=re_R2VVmBdr_HiZfw7md6HS8BpmUGSoq3F2a
```

Add to:
- `.env.local` (local dev)
- Vercel project environment variables (production)

## Out of Scope

- Email unsubscribe / preference management
- HTML email previewer in the admin dashboard
- PDF invoice attachments
- Retry queue for failed emails
- Email open/click tracking (Resend provides this in their dashboard automatically)
