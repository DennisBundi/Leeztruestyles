# Email Notifications — Full System Design

**Date:** 2026-07-01
**Status:** Approved

---

## Overview

Extend the existing Resend email system to cover all customer-facing lifecycle touchpoints: account, order stages, invoice, loyalty, and importation waitlist. Resend is already wired up and domain-verified. Three emails already exist (order confirmation, delivery, cancellation). This spec adds 7 more.

---

## Architecture

### New files
- `src/lib/email/invoice-pdf.tsx` — React PDF component via `@react-pdf/renderer`
- `src/app/api/cron/birthday-emails/route.ts` — Birthday cron endpoint
- `vercel.json` — Cron schedule config

### Extended files
- `src/lib/email/templates.ts` — 7 new template functions
- `src/lib/email/service.ts` — 7 new service functions

### Existing files modified
| Route | Change |
|---|---|
| `src/app/auth/callback/route.ts` | Call `sendWelcomeEmail` after session exchange, before redirect |
| `src/app/api/orders/update/route.ts` | Call `sendOrderProcessingEmail` / `sendRefundEmail` on status transition |
| `src/app/api/payments/verify/route.ts` | Call `sendInvoiceEmail` alongside existing `sendOrderConfirmation` (line 139) |
| `src/app/api/payments/callback/mpesa/route.ts` | Call `sendInvoiceEmail` alongside existing `sendOrderConfirmation` (line 216) |
| `src/app/api/payments/paystack/route.ts` | Call `sendInvoiceEmail` alongside existing `sendOrderConfirmation` (line 134) |
| `src/app/api/loyalty/referral/apply/route.ts` | Call `sendReferralRewardEmail` to referrer after referral created |
| `src/app/api/importation/waitlist/route.ts` | Call `sendImportationWaitlistEmail` after successful insert |

---

## Templates (7 new)

All templates follow the existing `shell()` / `HDR` / `FTR` / `css()` pattern in `templates.ts`.

| Function | Subject | Key content |
|---|---|---|
| `welcomeTemplate(name)` | `Welcome to Leeztruestyles!` | Branded greeting, link to shop, WhatsApp CTA |
| `orderProcessingTemplate(order, items, name, isStoreCopy)` | `Your order is being prepared — #XXXX` | Status update, items list, estimated timeline |
| `refundTemplate(order, name, isStoreCopy)` | `Refund initiated — #XXXX` | Amount, 3–5 business day notice, WhatsApp CTA |
| `invoiceEmailTemplate(order, name)` | `Your invoice — #XXXX` | Short body noting PDF is attached |
| `referralRewardTemplate(referrerName, referredFirstName, pointsAwarded)` | `You earned points from a referral!` | Referred person's first name, points awarded |
| `birthdayOfferTemplate(name, discountCode, expiresAt)` | `Happy Birthday! Here's a gift 🎂` | Discount code, 7-day expiry, shop CTA |
| `importationWaitlistTemplate(name)` | `You're on the Leeztruestyles Importation Waitlist` | Confirmation, what happens next, WhatsApp CTA |

---

## PDF Invoice

**Library:** `@react-pdf/renderer`

**Content:**
- Leeztruestyles navy header
- Order number, date, customer name
- Line items table: product name, qty, unit price, subtotal
- Total row + payment method
- Footer: store email + WhatsApp number

**Delivery:** Generated server-side as a `Buffer`, attached to Resend via:
```ts
attachments: [{ filename: `invoice-${orderNum}.pdf`, content: buffer }]
```
Fires as a separate email (not the same send as order confirmation).

---

## Service Functions (7 new)

All functions follow the existing try/catch pattern — errors are logged, never thrown, so a failed email never breaks the user-facing flow.

### `sendWelcomeEmail(userId: string)`
- Fetches `full_name` + `email` from `users` table
- Sends `welcomeTemplate` to customer only (no store copy)
- **Trigger:** `/auth/callback` after `exchangeCodeForSession` succeeds, before redirect

### `sendOrderProcessingEmail(orderId: string)`
- Fetches order + items + customer (same pattern as `sendOrderConfirmation`)
- Sends `orderProcessingTemplate` to customer + store copy
- **Trigger:** `/api/orders/update` when `status === 'processing'` and previous status was not `processing`

### `sendRefundEmail(orderId: string)`
- Fetches order + customer
- Sends `refundTemplate` to customer + store copy
- **Trigger:** `/api/orders/update` when `status === 'refunded'` and previous status was not `refunded`

### `sendInvoiceEmail(orderId: string)`
- Fetches order + items + customer
- Generates PDF buffer via `invoice-pdf.tsx`
- Sends `invoiceEmailTemplate` to customer with PDF attached
- **Trigger:** All 3 payment routes (`payments/verify`, `payments/callback/mpesa`, `payments/paystack`) — alongside existing `sendOrderConfirmation` call in each

### `sendReferralRewardEmail(referrerId: string, referredFirstName: string)`
- Fetches referrer's `email` + `full_name` from `users`
- Sends `referralRewardTemplate` to referrer only
- **Trigger:** `/api/loyalty/referral/apply` after referral record inserted successfully

### `sendBirthdayOfferEmail(userId: string, discountCode: string, expiresAt: string)`
- Fetches `email` + `full_name` from `users`
- Sends `birthdayOfferTemplate` to customer only
- **Trigger:** `/api/cron/birthday-emails` per matched user

### `sendImportationWaitlistEmail(email: string, name: string)`
- No DB fetch needed — email + name come from the request body
- Sends `importationWaitlistTemplate` to customer only
- **Trigger:** `POST /api/importation/waitlist` after successful insert

---

## Birthday Cron

**Schedule:** `0 5 * * *` (5am UTC = 8am EAT, daily)

**`vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/birthday-emails",
      "schedule": "0 5 * * *"
    }
  ]
}
```

**Route logic (`/api/cron/birthday-emails`):**
1. Verify `Authorization: Bearer ${CRON_SECRET}` header
2. Query `users` joined with `loyalty_accounts` where `EXTRACT(month FROM birthday) = current_month AND EXTRACT(day FROM birthday) = current_day`
3. For each matched user:
   - Insert a `reward_codes` row: type `birthday_offer`, 10% discount, expires 7 days from now
   - Call `sendBirthdayOfferEmail(userId, code, expiresAt)`
4. Return count of emails sent

**New env var:** `CRON_SECRET` — added to `.env.local` and Vercel project settings.

---

## Status Transition Guard

`/api/orders/update` already has a guard for cancellation (fetches previous status before update). The same pattern applies to `processing` and `refunded`:

```ts
// Pre-fetch current status for email guards
if (['processing', 'refunded', 'cancelled'].includes(validated.status ?? '')) {
  const { data } = await supabase.from('orders').select('status').eq('id', validated.order_id).single()
  previousStatus = data?.status ?? null
}
```

Each email fires only when transitioning INTO that status, not when already in it.

---

## Dependency

```
npm install @react-pdf/renderer
```

No other new dependencies.

---

## What is NOT in scope

- Password reset email (Supabase handles this natively)
- Low stock / inventory alerts (admin tooling, separate feature)
- Loyalty points balance summary emails (not requested)
- Review request emails after delivery (not requested)
