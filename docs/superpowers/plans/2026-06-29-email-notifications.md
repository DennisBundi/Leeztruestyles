# Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Resend to send transactional emails (order confirmation, delivery confirmation, cancellation) to customers and the store inbox after key order lifecycle events.

**Architecture:** Three-layer approach — thin Resend client singleton → pure template functions → service functions that fetch data and dispatch emails. Five API routes are wired to call the service functions after their status transitions. Email errors are always swallowed so they never break API responses.

**Tech Stack:** Next.js App Router (API routes), Resend SDK, Supabase admin client, Jest

## Global Constraints

- `FROM` address: `orders@leeztruestyles.com` (requires domain verification in Resend dashboard first)
- `Reply-To`: `leeztruestyles44@gmail.com`
- Store BCC recipient: `leeztruestyles44@gmail.com`
- Errors: never rethrow — always `console.error('[email]', error)` and return
- No retry logic — Resend handles delivery retries
- Single branch workflow — commit directly to `main`
- Test files go in `tests/` directory with `@jest-environment node` docblock
- `@jest-environment node` is required on all API route and service tests

---

### Task 1: Install Resend + configure env

**Files:**
- `.env.local` — add env var (manual step, documented below)
- `package.json` — npm install adds the dependency

**Interfaces:**
- Produces: `process.env.RESEND_API_KEY` available at runtime; `resend` package importable

- [ ] **Step 1: Install the Resend package**

Run:
```bash
npm install resend
```
Expected: `package.json` and `package-lock.json` updated, no errors.

- [ ] **Step 2: Add env var to `.env.local`**

Open `.env.local` in the project root and add this line at the bottom:
```
RESEND_API_KEY=re_R2VVmBdr_HiZfw7md6HS8BpmUGSoq3F2a
```

- [ ] **Step 3: Note Vercel env var requirement (not automated)**

Before going to production, the user must add `RESEND_API_KEY=re_R2VVmBdr_HiZfw7md6HS8BpmUGSoq3F2a` to Vercel project → Settings → Environment Variables.

Also, the domain `leeztruestyles.com` must be verified in the Resend dashboard (resend.com → Domains → Add Domain) before the `orders@leeztruestyles.com` sender address will work. In local dev, Resend will return an error for unverified domains; the service swallows errors, so this won't break anything.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add resend package for transactional emails"
```

---

### Task 2: Create Resend client singleton

**Files:**
- Create: `src/lib/email/resend.ts`

**Interfaces:**
- Produces: `resendClient` — an instance of `Resend` importable by `service.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/email/resend.ts`:
```typescript
import { Resend } from 'resend'

export const resendClient = new Resend(process.env.RESEND_API_KEY)
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/resend.ts
git commit -m "feat: add Resend client singleton"
```

---

### Task 3: Create email templates with tests

**Files:**
- Create: `src/lib/email/templates.ts`
- Create: `tests/lib/email/templates.test.ts`

**Interfaces:**
- Produces:
  - `EmailTemplate = { subject: string; html: string }`
  - `OrderForEmail = { id: string; created_at: string; payment_method: string; total_amount: number }`
  - `OrderItemForEmail = { product_name: string; quantity: number; unit_price: number }`
  - `orderConfirmationTemplate(order, items, customerName, isStoreCopy?) → EmailTemplate`
  - `deliveryConfirmationTemplate(order, items, customerName, isStoreCopy?) → EmailTemplate`
  - `cancellationTemplate(order, customerName, isStoreCopy?) → EmailTemplate`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/email/templates.test.ts`:
```typescript
/** @jest-environment node */
import { describe, it, expect } from '@jest/globals'
import {
  orderConfirmationTemplate,
  deliveryConfirmationTemplate,
  cancellationTemplate,
} from '@/lib/email/templates'

const mockOrder = {
  id: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
  created_at: '2026-01-15T10:00:00Z',
  payment_method: 'mpesa',
  total_amount: 3500,
}

const mockItems = [
  { product_name: 'Ankara Dress', quantity: 2, unit_price: 1500 },
  { product_name: 'Kitenge Skirt', quantity: 1, unit_price: 500 },
]

describe('orderConfirmationTemplate', () => {
  it('returns subject containing order number', () => {
    const { subject } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/Order Confirmed/)
  })

  it('customer copy contains customer name and items', () => {
    const { html } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).toContain('Jane Doe')
    expect(html).toContain('Ankara Dress')
    expect(html).toContain('Kitenge Skirt')
    expect(html).toContain('M-Pesa')
  })

  it('customer copy does not contain store banner', () => {
    const { html } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).not.toContain('New order received')
  })

  it('store copy contains "New order received" banner', () => {
    const { html } = orderConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', true)
    expect(html).toContain('New order received')
  })
})

describe('deliveryConfirmationTemplate', () => {
  it('returns subject containing order number', () => {
    const { subject } = deliveryConfirmationTemplate(mockOrder, mockItems, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/delivered/)
  })

  it('customer copy contains order number and product names', () => {
    const { html } = deliveryConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).toContain('LEEZT-')
    expect(html).toContain('Ankara Dress')
  })

  it('store copy contains customer name', () => {
    const { html } = deliveryConfirmationTemplate(mockOrder, mockItems, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})

describe('cancellationTemplate', () => {
  it('returns subject containing order number', () => {
    const { subject } = cancellationTemplate(mockOrder, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/Cancelled/)
  })

  it('customer copy contains refund notice', () => {
    const { html } = cancellationTemplate(mockOrder, 'Jane Doe', false)
    expect(html).toContain('refund')
  })

  it('store copy contains customer name', () => {
    const { html } = cancellationTemplate(mockOrder, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/lib/email/templates.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/lib/email/templates'`

- [ ] **Step 3: Create the templates file**

Create `src/lib/email/templates.ts`:
```typescript
import { formatOrderId } from '@/lib/utils/orderId'

export interface EmailTemplate {
  subject: string
  html: string
}

export interface OrderForEmail {
  id: string
  created_at: string
  payment_method: string
  total_amount: number
}

export interface OrderItemForEmail {
  product_name: string
  quantity: number
  unit_price: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toFixed(2)}`
}

function paymentLabel(method: string): string {
  const labels: Record<string, string> = { mpesa: 'M-Pesa', card: 'Card', cash: 'Cash' }
  return labels[method] ?? method
}

function css(): string {
  return `
    body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
    .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden}
    .hdr{background:#1a1a2e;color:#fff;padding:24px;text-align:center}
    .hdr h1{margin:0;font-size:24px;letter-spacing:1px}
    .body{padding:24px}
    .num{font-size:13px;color:#666;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th{background:#f4f4f4;text-align:left;padding:8px 12px;font-size:13px}
    td{padding:8px 12px;border-bottom:1px solid #eee;font-size:14px}
    .total{font-weight:bold;font-size:16px;text-align:right;margin-top:8px}
    .ftr{background:#f4f4f4;padding:16px 24px;text-align:center;font-size:12px;color:#888}
    .cta{display:inline-block;background:#25d366;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;margin-top:16px}
    .banner{background:#e8f4fd;border-left:4px solid #2196f3;padding:12px 16px;margin-bottom:16px;font-size:14px}
  `
}

function shell(body: string): string {
  return `<!DOCTYPE html><html><head><style>${css()}</style></head><body><div class="wrap">${body}</div></body></html>`
}

const HDR = `<div class="hdr"><h1>Leeztruestyles</h1></div>`
const FTR = `<div class="ftr">Leeztruestyles &middot; leeztruestyles44@gmail.com</div>`
const WA = `<a class="cta" href="https://wa.me/254700000000">Contact us on WhatsApp</a>`

export function orderConfirmationTemplate(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Order Confirmed — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#128230; New order received &mdash; ${customerName}</div>`
    : ''

  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.product_name}</td><td style="text-align:center">${i.quantity}</td>` +
        `<td style="text-align:right">${formatCurrency(i.unit_price)}</td>` +
        `<td style="text-align:right">${formatCurrency(i.quantity * i.unit_price)}</td></tr>`
    )
    .join('')

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Thank you for your order, ${customerName}!</h2>
      <div class="num">Order #${num} &middot; ${formatDate(order.created_at)}</div>
      <table>
        <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total: ${formatCurrency(order.total_amount)}</div>
      <p>Payment: ${paymentLabel(order.payment_method)}</p>
      <p>We&#39;ll notify you when your order is on its way.</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function deliveryConfirmationTemplate(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Your order has been delivered — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#9989; Order #${num} marked as delivered &mdash; ${customerName}</div>`
    : ''

  const productNames = items.map((i) => i.product_name).join(', ')

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Your order has arrived!</h2>
      <div class="num">Order #${num}</div>
      <p>Items: ${productNames}</p>
      <p>Thank you for shopping with Leeztruestyles!</p>
      ${WA.replace('Contact us on WhatsApp', 'Contact us on WhatsApp for any issues')}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function cancellationTemplate(
  order: OrderForEmail,
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Order Cancelled — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#10060; Order #${num} has been cancelled &mdash; ${customerName}</div>`
    : ''

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Your order has been cancelled</h2>
      <div class="num">Order #${num}</div>
      <p>If you made a payment, your refund will be processed within 3&ndash;5 business days.</p>
      ${WA.replace('Contact us on WhatsApp', 'Contact us on WhatsApp for questions')}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/lib/email/templates.test.ts --no-coverage
```
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/templates.ts tests/lib/email/templates.test.ts
git commit -m "feat: add email templates for order confirmation, delivery, and cancellation"
```

---

### Task 4: Create email service with tests

**Files:**
- Create: `src/lib/email/service.ts`
- Create: `tests/lib/email/service.test.ts`

**Interfaces:**
- Consumes: `resendClient` from `./resend`, template functions from `./templates`, `createAdminClient` from `@/lib/supabase/admin`
- Produces:
  - `sendOrderConfirmation(orderId: string, customerEmail?: string): Promise<void>`
  - `sendDeliveryConfirmation(orderId: string, customerEmail?: string): Promise<void>`
  - `sendCancellationEmail(orderId: string, customerEmail?: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/email/service.test.ts`:
```typescript
/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock resend client
const mockEmailSend = jest.fn().mockResolvedValue({ id: 'email-id-1' })
jest.mock('@/lib/email/resend', () => ({
  resendClient: { emails: { send: mockEmailSend } },
}))

// Mock data
const mockOrder = {
  id: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
  created_at: '2026-01-15T10:00:00Z',
  payment_method: 'mpesa',
  total_amount: 3500,
  user_id: 'user-uuid-1',
}
const mockItems = [
  { products: { name: 'Ankara Dress' }, quantity: 1, unit_price: 3500 },
]
const mockUserWithEmail = { full_name: 'Jane Doe', email: 'jane@example.com' }
const mockUserNoEmail = { full_name: 'Jane Doe', email: null }

// Build chained mock for Supabase admin
function makeSingle(data: unknown) {
  return { single: jest.fn().mockResolvedValue({ data, error: null }) }
}

function makeAdminClient(userRow: typeof mockUserWithEmail | typeof mockUserNoEmail) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(makeSingle(mockOrder)) }) }
      }
      if (table === 'order_items') {
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: mockItems, error: null }) }) }
      }
      if (table === 'users') {
        return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(makeSingle(userRow)) }) }
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(makeSingle(null)) }) }
    }),
  }
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

describe('sendOrderConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends two emails when customer email is resolvable', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await sendOrderConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
    const calls = mockEmailSend.mock.calls
    const allRecipients = calls.flatMap((c: any) => c[0].to)
    expect(allRecipients).toContain('jane@example.com')
    expect(allRecipients).toContain('leeztruestyles44@gmail.com')
  })

  it('sends only the store copy when customer has no email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await sendOrderConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('leeztruestyles44@gmail.com')
  })

  it('uses the customerEmail override instead of DB lookup', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await sendOrderConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'override@example.com')

    const allRecipients = mockEmailSend.mock.calls.flatMap((c: any) => c[0].to)
    expect(allRecipients).toContain('override@example.com')
  })

  it('swallows errors without rethrowing', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) }),
        }),
      }),
    })

    const { sendOrderConfirmation } = await import('@/lib/email/service')
    await expect(sendOrderConfirmation('bad-id')).resolves.toBeUndefined()
  })
})

describe('sendDeliveryConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends two emails when customer email is resolvable', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendDeliveryConfirmation } = await import('@/lib/email/service')
    await sendDeliveryConfirmation('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
  })
})

describe('sendCancellationEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends two emails when customer email is resolvable', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendCancellationEmail } = await import('@/lib/email/service')
    await sendCancellationEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/lib/email/service.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/lib/email/service'`

- [ ] **Step 3: Create the service file**

Create `src/lib/email/service.ts`:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { resendClient } from './resend'
import {
  orderConfirmationTemplate,
  deliveryConfirmationTemplate,
  cancellationTemplate,
  type OrderForEmail,
  type OrderItemForEmail,
} from './templates'

const STORE_EMAIL = 'leeztruestyles44@gmail.com'
const FROM_EMAIL = 'orders@leeztruestyles.com'
const REPLY_TO = 'leeztruestyles44@gmail.com'

async function fetchOrderWithItems(
  orderId: string
): Promise<{ order: OrderForEmail & { user_id: string | null }; items: OrderItemForEmail[] }> {
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, created_at, payment_method, total_amount, user_id')
    .eq('id', orderId)
    .single()

  if (orderError || !order) throw new Error(`Order not found: ${orderId}`)

  const { data: rawItems, error: itemsError } = await admin
    .from('order_items')
    .select('quantity, unit_price, products(name)')
    .eq('order_id', orderId)

  if (itemsError) throw new Error(`Failed to fetch items: ${itemsError.message}`)

  const items: OrderItemForEmail[] = (rawItems ?? []).map((i: any) => ({
    product_name: i.products?.name ?? 'Unknown product',
    quantity: i.quantity,
    unit_price: i.unit_price,
  }))

  return { order, items }
}

async function fetchCustomerName(userId: string | null): Promise<string> {
  if (!userId) return 'Customer'
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('full_name').eq('id', userId).single()
  return (data as any)?.full_name ?? 'Customer'
}

async function resolveEmail(userId: string | null, override?: string): Promise<string | null> {
  if (override) return override
  if (!userId) return null
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('email').eq('id', userId).single()
  return (data as any)?.email ?? null
}

async function dispatch(recipients: string[], subject: string, html: string): Promise<void> {
  await resendClient.emails.send({ from: FROM_EMAIL, to: recipients, reply_to: REPLY_TO, subject, html })
}

export async function sendOrderConfirmation(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)

    if (email) {
      const t = orderConfirmationTemplate(order, items, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = orderConfirmationTemplate(order, items, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendOrderConfirmation failed:', error)
  }
}

export async function sendDeliveryConfirmation(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)

    if (email) {
      const t = deliveryConfirmationTemplate(order, items, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = deliveryConfirmationTemplate(order, items, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendDeliveryConfirmation failed:', error)
  }
}

export async function sendCancellationEmail(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)

    if (email) {
      const t = cancellationTemplate(order, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = cancellationTemplate(order, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendCancellationEmail failed:', error)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/lib/email/service.test.ts --no-coverage
```
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/service.ts tests/lib/email/service.test.ts
git commit -m "feat: add email service functions for order lifecycle events"
```

---

### Task 5: Wire order confirmation to payment triggers

**Files:**
- Modify: `src/app/api/payments/paystack/route.ts`
- Modify: `src/app/api/payments/callback/mpesa/route.ts`
- Modify: `src/app/api/payments/verify/route.ts`
- Modify: `tests/api/payments/paystack.test.ts`

**Interfaces:**
- Consumes: `sendOrderConfirmation` from `@/lib/email/service`

- [ ] **Step 1: Update the Paystack webhook route**

In `src/app/api/payments/paystack/route.ts`, add the import at line 9 (after the existing imports):
```typescript
import { sendOrderConfirmation } from '@/lib/email/service'
```

Then, inside the `charge.success` block, add the email call just before the final `return NextResponse.json({ success: true })` at line 133. Replace:
```typescript
      return NextResponse.json({ success: true });
    }
```
With:
```typescript
      await sendOrderConfirmation(orderId, data.customer?.email)
      return NextResponse.json({ success: true });
    }
```

The idempotency check at line 57 (`if (existingOrder?.status === 'completed')`) already returns early for duplicate events, so this call only fires on the first successful processing.

- [ ] **Step 2: Update the M-Pesa callback route**

In `src/app/api/payments/callback/mpesa/route.ts`, add the import after the existing imports:
```typescript
import { sendOrderConfirmation } from '@/lib/email/service'
```

Inside the `ResultCode === 0` branch, add the email call just before `return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })` (currently line 215). Replace:
```typescript
      console.log('Order completed successfully:', order.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
```
With:
```typescript
      console.log('Order completed successfully:', order.id);
      await sendOrderConfirmation(order.id)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
```

The idempotency check at line 72 (`if (order.status === 'paid' && ResultCode === 0)`) already handles duplicate callbacks.

- [ ] **Step 3: Update the payment verify route**

In `src/app/api/payments/verify/route.ts`, add the import after the existing imports:
```typescript
import { sendOrderConfirmation } from '@/lib/email/service'
```

Add the email call just before the final `return NextResponse.json({ success: true, order_id: order.id })` at line 138. Replace:
```typescript
    return NextResponse.json({ success: true, order_id: order.id });
```
With:
```typescript
    await sendOrderConfirmation(order.id, user.email ?? undefined)
    return NextResponse.json({ success: true, order_id: order.id });
```

The idempotency check at line 67 (`if (order.status === 'paid') return ...`) already handles re-verification.

- [ ] **Step 4: Update the Paystack test to mock the email service**

In `tests/api/payments/paystack.test.ts`, add this mock after the existing `jest.mock` calls (after line 28):
```typescript
jest.mock('@/lib/email/service', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
}))
```

- [ ] **Step 5: Run existing tests to verify no regressions**

```bash
npx jest tests/api/payments/paystack.test.ts --no-coverage
```
Expected: PASS — all existing tests still green.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/payments/paystack/route.ts src/app/api/payments/callback/mpesa/route.ts src/app/api/payments/verify/route.ts tests/api/payments/paystack.test.ts
git commit -m "feat: send order confirmation email after payment success"
```

---

### Task 6: Wire delivery and cancellation triggers

**Files:**
- Modify: `src/app/api/orders/[id]/deliver/route.ts`
- Modify: `src/app/api/orders/update/route.ts`
- Modify: `tests/api/orders/deliver.test.ts`
- Modify: `tests/api/orders/update.test.ts`

**Interfaces:**
- Consumes: `sendDeliveryConfirmation`, `sendCancellationEmail` from `@/lib/email/service`

- [ ] **Step 1: Update the deliver route**

In `src/app/api/orders/[id]/deliver/route.ts`, add the import after the existing imports:
```typescript
import { sendDeliveryConfirmation } from '@/lib/email/service'
```

Add the email call just before the success return at line 56. Replace:
```typescript
    return NextResponse.json({ success: true })
```
With:
```typescript
    await sendDeliveryConfirmation(id)
    return NextResponse.json({ success: true })
```

- [ ] **Step 2: Update the order update route**

In `src/app/api/orders/update/route.ts`, add the import after the existing imports:
```typescript
import { sendCancellationEmail } from '@/lib/email/service'
```

Then, in the `PUT` handler, add a pre-fetch for the current order status when cancelling. Add this block after line 54 (after the `updateData` construction, before the Supabase update call). Replace:
```typescript
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', validated.order_id);
```
With:
```typescript
    // Pre-fetch current status to prevent duplicate cancellation emails
    let previousStatus: string | null = null
    if (validated.status === 'cancelled') {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', validated.order_id)
        .single()
      previousStatus = currentOrder?.status ?? null
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', validated.order_id);
```

Then add the email call before each of the two `return NextResponse.json({ success: true })` statements in the route.

The first one is inside the social_platform fallback branch (currently around line 78). Replace:
```typescript
        return NextResponse.json({ success: true, warning: 'Social platform column not found, order updated without it' });
```
With:
```typescript
        if (validated.status === 'cancelled' && previousStatus !== 'cancelled') {
          await sendCancellationEmail(validated.order_id)
        }
        return NextResponse.json({ success: true, warning: 'Social platform column not found, order updated without it' });
```

The second one is the normal success return at line 90. Replace:
```typescript
    return NextResponse.json({ success: true });
```
With:
```typescript
    if (validated.status === 'cancelled' && previousStatus !== 'cancelled') {
      await sendCancellationEmail(validated.order_id)
    }
    return NextResponse.json({ success: true });
```

- [ ] **Step 3: Update the deliver test to mock the email service**

In `tests/api/orders/deliver.test.ts`, add this mock after the existing `jest.mock` calls (after line 39):
```typescript
jest.mock('@/lib/email/service', () => ({
  sendDeliveryConfirmation: jest.fn().mockResolvedValue(undefined),
}))
```

- [ ] **Step 4: Update the order update test to mock the email service**

Open `tests/api/orders/update.test.ts`. Add this mock after the existing `jest.mock` calls:
```typescript
jest.mock('@/lib/email/service', () => ({
  sendCancellationEmail: jest.fn().mockResolvedValue(undefined),
}))
```

- [ ] **Step 5: Run existing tests to verify no regressions**

```bash
npx jest tests/api/orders/deliver.test.ts tests/api/orders/update.test.ts --no-coverage
```
Expected: PASS — all existing tests still green.

- [ ] **Step 6: Run the full email test suite**

```bash
npx jest tests/lib/email/ --no-coverage
```
Expected: PASS — all template and service tests green.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/orders/[id]/deliver/route.ts src/app/api/orders/update/route.ts tests/api/orders/deliver.test.ts tests/api/orders/update.test.ts
git commit -m "feat: send delivery and cancellation emails on order status transitions"
```

---

### Task 7: Push and verify

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage
```
Expected: PASS — no regressions across any test file.

- [ ] **Step 2: Add RESEND_API_KEY to Vercel**

In Vercel dashboard → Project → Settings → Environment Variables, add:
- Name: `RESEND_API_KEY`
- Value: `re_R2VVmBdr_HiZfw7md6HS8BpmUGSoq3F2a`
- Environment: Production, Preview

- [ ] **Step 3: Verify domain in Resend dashboard**

Go to resend.com → Domains → Add Domain → enter `leeztruestyles.com` → follow the DNS record instructions. Emails sent before domain verification will fail silently (errors are swallowed); after verification all emails will send normally.

- [ ] **Step 4: Push to origin**

```bash
git push
```

- [ ] **Step 5: Smoke test on production**

Place a test order through the checkout and verify:
- Customer receives an order confirmation email at their registered address
- `leeztruestyles44@gmail.com` receives a store copy with "New order received" banner
- After marking order as delivered in the dashboard, both parties receive delivery emails
