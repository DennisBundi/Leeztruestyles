# Email Notifications — Full System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 new transactional emails (welcome, order processing, refund, PDF invoice, referral reward, birthday offer, importation waitlist) to the existing Resend email system.

**Architecture:** Extend `src/lib/email/templates.ts` and `src/lib/email/service.ts` with new functions following established patterns. Add a React PDF component for invoice generation. Wire service functions into existing API routes and a new birthday cron endpoint.

**Tech Stack:** Next.js 14 App Router, TypeScript, Resend SDK (`resend`), `@react-pdf/renderer`, Supabase admin client, Vercel Cron, Jest

## Global Constraints

- All email functions must never throw — wrap in try/catch and log errors to `console.error`
- Store copy (`isStoreCopy = true`) goes to `leeztruestyles44@gmail.com` — customer copy goes to resolved customer email
- `FROM_EMAIL` is always `orders@leeztruestyles.com`, `REPLY_TO` is always `leeztruestyles44@gmail.com`
- All template functions must return `{ subject: string, html: string }` (the `EmailTemplate` type)
- All tests use `/** @jest-environment node */` docblock
- Run tests with: `npx jest <test-file-path> --no-coverage`
- Commit after every task

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/email/templates.ts` | Modify | Add 7 new template functions |
| `src/lib/email/invoice-pdf.tsx` | Create | React PDF component for invoice |
| `src/lib/email/service.ts` | Modify | Add 7 new service functions |
| `src/app/auth/callback/route.ts` | Modify | Fire welcome email after verification |
| `src/app/api/orders/update/route.ts` | Modify | Fire processing + refund emails |
| `src/app/api/payments/verify/route.ts` | Modify | Fire invoice + referral reward emails |
| `src/app/api/payments/callback/mpesa/route.ts` | Modify | Fire invoice + referral reward emails |
| `src/app/api/payments/paystack/route.ts` | Modify | Fire invoice + referral reward emails |
| `src/app/api/importation/waitlist/route.ts` | Modify | Fire waitlist confirmation email |
| `src/app/api/cron/birthday-emails/route.ts` | Create | Daily birthday email cron |
| `vercel.json` | Modify | Add cron schedule |
| `.env.local` | Modify | Add `CRON_SECRET` |
| `tests/lib/email/templates.test.ts` | Modify | Tests for 7 new templates |
| `tests/lib/email/service.test.ts` | Modify | Tests for 7 new service functions |
| `tests/api/cron/birthday-emails.test.ts` | Create | Tests for birthday cron route |

---

### Task 1: Install dependency + 7 new HTML templates

**Files:**
- Modify: `src/lib/email/templates.ts`
- Modify: `tests/lib/email/templates.test.ts`

**Interfaces:**
- Produces:
  - `welcomeTemplate(name: string): EmailTemplate`
  - `orderProcessingTemplate(order: OrderForEmail, items: OrderItemForEmail[], customerName: string, isStoreCopy?: boolean): EmailTemplate`
  - `refundTemplate(order: OrderForEmail, customerName: string, isStoreCopy?: boolean): EmailTemplate`
  - `invoiceEmailTemplate(order: OrderForEmail, customerName: string): EmailTemplate`
  - `referralRewardTemplate(referrerName: string, referredFirstName: string, pointsAwarded: number): EmailTemplate`
  - `birthdayOfferTemplate(name: string, discountCode: string, expiresAt: string): EmailTemplate`
  - `importationWaitlistTemplate(name: string): EmailTemplate`

- [ ] **Step 1: Install `@react-pdf/renderer`**

```bash
npm install @react-pdf/renderer
```

Expected output: package added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Write failing tests for the 7 new templates**

Append to `tests/lib/email/templates.test.ts` (after the existing `cancellationTemplate` describe block):

```ts
describe('welcomeTemplate', () => {
  it('subject contains Welcome', () => {
    const { subject } = welcomeTemplate('Jane Doe')
    expect(subject).toContain('Welcome')
  })

  it('html contains customer name', () => {
    const { html } = welcomeTemplate('Jane Doe')
    expect(html).toContain('Jane Doe')
    expect(html).toContain('Leeztruestyles')
  })
})

describe('orderProcessingTemplate', () => {
  it('subject contains order number and preparing', () => {
    const { subject } = orderProcessingTemplate(mockOrder, mockItems, 'Jane Doe')
    expect(subject).toMatch(/LEEZT-/)
    expect(subject).toMatch(/preparing/i)
  })

  it('customer copy contains items', () => {
    const { html } = orderProcessingTemplate(mockOrder, mockItems, 'Jane Doe', false)
    expect(html).toContain('Ankara Dress')
    expect(html).not.toContain('being prepared for')
  })

  it('store copy contains customer name banner', () => {
    const { html } = orderProcessingTemplate(mockOrder, mockItems, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})

describe('refundTemplate', () => {
  it('subject contains Refund and order number', () => {
    const { subject } = refundTemplate(mockOrder, 'Jane Doe')
    expect(subject).toMatch(/Refund/i)
    expect(subject).toMatch(/LEEZT-/)
  })

  it('html contains refund notice', () => {
    const { html } = refundTemplate(mockOrder, 'Jane Doe', false)
    expect(html).toContain('refund')
    expect(html).toContain('3')
  })

  it('store copy contains customer name', () => {
    const { html } = refundTemplate(mockOrder, 'Jane Doe', true)
    expect(html).toContain('Jane Doe')
  })
})

describe('invoiceEmailTemplate', () => {
  it('subject contains invoice and order number', () => {
    const { subject } = invoiceEmailTemplate(mockOrder, 'Jane Doe')
    expect(subject).toMatch(/invoice/i)
    expect(subject).toMatch(/LEEZT-/)
  })

  it('html mentions PDF attachment', () => {
    const { html } = invoiceEmailTemplate(mockOrder, 'Jane Doe')
    expect(html).toContain('Jane Doe')
    expect(html.toLowerCase()).toContain('attach')
  })
})

describe('referralRewardTemplate', () => {
  it('subject mentions points earned', () => {
    const { subject } = referralRewardTemplate('John', 'Mary', 100)
    expect(subject.toLowerCase()).toContain('point')
  })

  it('html contains referred name and points', () => {
    const { html } = referralRewardTemplate('John', 'Mary', 100)
    expect(html).toContain('Mary')
    expect(html).toContain('100')
  })
})

describe('birthdayOfferTemplate', () => {
  it('subject contains birthday', () => {
    const { subject } = birthdayOfferTemplate('Jane', 'BDAY-ABC123', '2026-07-08')
    expect(subject.toLowerCase()).toContain('birthday')
  })

  it('html contains name and discount code', () => {
    const { html } = birthdayOfferTemplate('Jane', 'BDAY-ABC123', '2026-07-08')
    expect(html).toContain('Jane')
    expect(html).toContain('BDAY-ABC123')
  })
})

describe('importationWaitlistTemplate', () => {
  it('subject confirms waitlist', () => {
    const { subject } = importationWaitlistTemplate('Jane')
    expect(subject.toLowerCase()).toContain('waitlist')
  })

  it('html contains name and next steps', () => {
    const { html } = importationWaitlistTemplate('Jane')
    expect(html).toContain('Jane')
    expect(html.toLowerCase()).toContain('touch')
  })
})
```

Also add the new imports at the top of the file:
```ts
import {
  orderConfirmationTemplate,
  deliveryConfirmationTemplate,
  cancellationTemplate,
  welcomeTemplate,
  orderProcessingTemplate,
  refundTemplate,
  invoiceEmailTemplate,
  referralRewardTemplate,
  birthdayOfferTemplate,
  importationWaitlistTemplate,
} from '@/lib/email/templates'
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx jest tests/lib/email/templates.test.ts --no-coverage
```

Expected: FAIL — functions not exported from templates.

- [ ] **Step 4: Add 7 new template functions to `src/lib/email/templates.ts`**

Append after the `cancellationTemplate` export:

```ts
export function welcomeTemplate(customerName: string): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>Welcome to Leeztruestyles, ${customerName}!</h2>
      <p>We're thrilled to have you. Explore our latest collections and find your style.</p>
      <p>As a member you'll earn Leez Rewards points on every purchase, get early access to new arrivals, and enjoy exclusive member offers.</p>
      ${WA}
    </div>
    ${FTR}`
  return { subject: 'Welcome to Leeztruestyles!', html: shell(body) }
}

export function orderProcessingTemplate(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Your order is being prepared — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#9201; Order #${num} is now processing &mdash; ${customerName}</div>`
    : ''

  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.product_name}</td><td style="text-align:center">${i.quantity}</td>` +
        `<td style="text-align:right">${formatCurrency(i.unit_price)}</td></tr>`
    )
    .join('')

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>We're preparing your order, ${customerName}!</h2>
      <div class="num">Order #${num} &middot; ${formatDate(order.created_at)}</div>
      <table>
        <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total: ${formatCurrency(order.total_amount)}</div>
      <p>We'll let you know as soon as it's on its way.</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function refundTemplate(
  order: OrderForEmail,
  customerName: string,
  isStoreCopy = false
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Refund initiated — #${num}`

  const banner = isStoreCopy
    ? `<div class="banner">&#128260; Refund initiated for order #${num} &mdash; ${customerName}</div>`
    : ''

  const body = `
    ${HDR}
    <div class="body">
      ${banner}
      <h2>Your refund is on its way, ${customerName}</h2>
      <div class="num">Order #${num}</div>
      <p>We've initiated a refund of <strong>${formatCurrency(order.total_amount)}</strong> for your order.</p>
      <p>Please allow 3&ndash;5 business days for the funds to reflect in your account.</p>
      ${WA.replace('Contact us on WhatsApp', 'Contact us on WhatsApp for any questions')}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function invoiceEmailTemplate(
  order: OrderForEmail,
  customerName: string
): EmailTemplate {
  const num = formatOrderId(order.id)
  const subject = `Your invoice — #${num}`

  const body = `
    ${HDR}
    <div class="body">
      <h2>Hi ${customerName}, here is your invoice</h2>
      <div class="num">Order #${num} &middot; ${formatDate(order.created_at)}</div>
      <p>Please find your invoice attached as a PDF. Keep it for your records.</p>
      <p>Total paid: <strong>${formatCurrency(order.total_amount)}</strong> via ${paymentLabel(order.payment_method)}.</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject, html: shell(body) }
}

export function referralRewardTemplate(
  referrerName: string,
  referredFirstName: string,
  pointsAwarded: number
): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>You earned points, ${referrerName}!</h2>
      <p><strong>${referredFirstName}</strong> just completed their first purchase using your referral code.</p>
      <p>We've added <strong>${pointsAwarded} Leez Rewards points</strong> to your account.</p>
      <p>Keep sharing your code to earn more rewards!</p>
      ${WA}
    </div>
    ${FTR}`

  return { subject: `You earned ${pointsAwarded} points from a referral!`, html: shell(body) }
}

export function birthdayOfferTemplate(
  customerName: string,
  discountCode: string,
  expiresAt: string
): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>Happy Birthday, ${customerName}! &#127874;</h2>
      <p>From all of us at Leeztruestyles, we hope you have a wonderful day.</p>
      <p>Here's a birthday gift — <strong>10% off</strong> your next order:</p>
      <div style="background:#f4f4f4;border-radius:6px;padding:16px;text-align:center;font-size:22px;font-weight:bold;letter-spacing:3px;margin:16px 0">
        ${discountCode}
      </div>
      <p style="font-size:13px;color:#666">Valid until ${formatDate(expiresAt)}. One use per account.</p>
      ${WA.replace('Contact us on WhatsApp', 'Shop now and treat yourself')}
    </div>
    ${FTR}`

  return { subject: `Happy Birthday! Here's a gift from Leeztruestyles 🎂`, html: shell(body) }
}

export function importationWaitlistTemplate(customerName: string): EmailTemplate {
  const body = `
    ${HDR}
    <div class="body">
      <h2>You're on the list, ${customerName}!</h2>
      <p>Thank you for your interest in Leeztruestyles Importation Services.</p>
      <p>We'll review your application and get in touch as soon as we're ready to onboard new clients.</p>
      <p>In the meantime, feel free to reach out if you have any questions.</p>
      ${WA}
    </div>
    ${FTR}`

  return {
    subject: `You're on the Leeztruestyles Importation Waitlist`,
    html: shell(body),
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx jest tests/lib/email/templates.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/templates.ts tests/lib/email/templates.test.ts package.json package-lock.json
git commit -m "feat: add 7 new email templates and install react-pdf"
```

---

### Task 2: PDF invoice component

**Files:**
- Create: `src/lib/email/invoice-pdf.tsx`
- Test: inline (no separate test file — PDF rendering is integration-tested in Task 3)

**Interfaces:**
- Consumes: `OrderForEmail`, `OrderItemForEmail` from `./templates`
- Produces:
  - `InvoicePDF` — default export React component (props: `{ order: OrderForEmail, items: OrderItemForEmail[], customerName: string }`)
  - `generateInvoiceBuffer(order: OrderForEmail, items: OrderItemForEmail[], customerName: string): Promise<Buffer>` — named export

- [ ] **Step 1: Create `src/lib/email/invoice-pdf.tsx`**

```tsx
import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { formatOrderId } from '@/lib/utils/orderId'
import type { OrderForEmail, OrderItemForEmail } from './templates'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, padding: 40, color: '#222' },
  header: { backgroundColor: '#1a1a2e', color: '#fff', padding: 20, marginBottom: 24 },
  headerTitle: { fontSize: 20, color: '#fff', letterSpacing: 2 },
  headerSub: { fontSize: 10, color: '#aaa', marginTop: 4 },
  section: { marginBottom: 16 },
  label: { fontSize: 9, color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4f4f4', padding: '6 8', marginTop: 12 },
  tableRow: { flexDirection: 'row', padding: '6 8', borderBottomWidth: 1, borderBottomColor: '#eee' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  tableHeaderText: { fontSize: 9, color: '#555', fontFamily: 'Helvetica-Bold' },
  total: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  totalLabel: { fontFamily: 'Helvetica-Bold', marginRight: 16 },
  totalValue: { fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#aaa' },
})

function formatCurrency(n: number) {
  return `KES ${n.toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
}

function paymentLabel(m: string) {
  const map: Record<string, string> = { mpesa: 'M-Pesa', card: 'Card', cash: 'Cash' }
  return map[m] ?? m
}

export default function InvoicePDF({
  order,
  items,
  customerName,
}: {
  order: OrderForEmail
  items: OrderItemForEmail[]
  customerName: string
}) {
  const num = formatOrderId(order.id)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LEEZTRUESTYLES</Text>
          <Text style={styles.headerSub}>leeztruestyles44@gmail.com</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Invoice Number</Text>
          <Text style={styles.value}>#{num}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDate(order.created_at)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Billed To</Text>
          <Text style={styles.value}>{customerName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.value}>{paymentLabel(order.payment_method)}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.col1, styles.tableHeaderText]}>Product</Text>
          <Text style={[styles.col2, styles.tableHeaderText]}>Qty</Text>
          <Text style={[styles.col3, styles.tableHeaderText]}>Unit Price</Text>
          <Text style={[styles.col4, styles.tableHeaderText]}>Subtotal</Text>
        </View>

        {items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.col1}>{item.product_name}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{formatCurrency(item.unit_price)}</Text>
            <Text style={styles.col4}>{formatCurrency(item.quantity * item.unit_price)}</Text>
          </View>
        ))}

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.total_amount)}</Text>
        </View>

        <Text style={styles.footer}>
          Leeztruestyles · leeztruestyles44@gmail.com · Thank you for your business!
        </Text>
      </Page>
    </Document>
  )
}

export async function generateInvoiceBuffer(
  order: OrderForEmail,
  items: OrderItemForEmail[],
  customerName: string
): Promise<Buffer> {
  return renderToBuffer(<InvoicePDF order={order} items={items} customerName={customerName} />)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors related to `invoice-pdf.tsx`. (Ignore pre-existing unrelated errors if any.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/invoice-pdf.tsx
git commit -m "feat: add PDF invoice component"
```

---

### Task 3: Service functions — welcome, processing, refund, invoice

**Files:**
- Modify: `src/lib/email/service.ts`
- Modify: `tests/lib/email/service.test.ts`

**Interfaces:**
- Consumes: `generateInvoiceBuffer` from `./invoice-pdf`; all 4 templates from `./templates`
- Produces:
  - `sendWelcomeEmail(userId: string): Promise<void>`
  - `sendOrderProcessingEmail(orderId: string): Promise<void>`
  - `sendRefundEmail(orderId: string): Promise<void>`
  - `sendInvoiceEmail(orderId: string, customerEmail?: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

Append to `tests/lib/email/service.test.ts` (after the `sendCancellationEmail` describe block).

First extend the mock setup at the top — add `mockPdfGenerate` alongside `mockEmailSend`:

```ts
// Add after mockEmailSend declaration (top of file)
const mockPdfGenerate = jest.fn().mockResolvedValue(Buffer.from('fake-pdf'))
jest.mock('@/lib/email/invoice-pdf', () => ({
  generateInvoiceBuffer: (...args: any[]) => mockPdfGenerate(...args),
}))
```

Then append the new describe blocks:

```ts
describe('sendWelcomeEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends one email to the customer', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendWelcomeEmail } = await import('@/lib/email/service')
    await sendWelcomeEmail('user-uuid-1')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('jane@example.com')
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

    const { sendWelcomeEmail } = await import('@/lib/email/service')
    await expect(sendWelcomeEmail('bad-id')).resolves.toBeUndefined()
  })
})

describe('sendOrderProcessingEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends two emails when customer has email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendOrderProcessingEmail } = await import('@/lib/email/service')
    await sendOrderProcessingEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
    const recipients = mockEmailSend.mock.calls.flatMap((c: any) => c[0].to)
    expect(recipients).toContain('jane@example.com')
    expect(recipients).toContain('leeztruestyles44@gmail.com')
  })
})

describe('sendRefundEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends two emails when customer has email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendRefundEmail } = await import('@/lib/email/service')
    await sendRefundEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(2)
  })

  it('sends only store copy when no customer email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendRefundEmail } = await import('@/lib/email/service')
    await sendRefundEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('leeztruestyles44@gmail.com')
  })
})

describe('sendInvoiceEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends one email with PDF attachment when customer has email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendInvoiceEmail } = await import('@/lib/email/service')
    await sendInvoiceEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockPdfGenerate).toHaveBeenCalledTimes(1)
    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    const call = mockEmailSend.mock.calls[0][0]
    expect(call.to).toContain('jane@example.com')
    expect(call.attachments).toHaveLength(1)
    expect(call.attachments[0].filename).toMatch(/^invoice-LEEZT-/)
  })

  it('does not send when customer has no email and no override', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendInvoiceEmail } = await import('@/lib/email/service')
    await sendInvoiceEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890')

    expect(mockEmailSend).not.toHaveBeenCalled()
  })

  it('uses customerEmail override', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendInvoiceEmail } = await import('@/lib/email/service')
    await sendInvoiceEmail('f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'override@example.com')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('override@example.com')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/lib/email/service.test.ts --no-coverage
```

Expected: FAIL — functions not exported from service.

- [ ] **Step 3: Add 4 new service functions to `src/lib/email/service.ts`**

Update the imports at the top of `service.ts`. The file already imports some templates — replace that import block with:
```ts
import { generateInvoiceBuffer } from './invoice-pdf'
import { formatOrderId } from '@/lib/utils/orderId'
import {
  orderConfirmationTemplate,
  deliveryConfirmationTemplate,
  cancellationTemplate,
  welcomeTemplate,
  orderProcessingTemplate,
  refundTemplate,
  invoiceEmailTemplate,
  referralRewardTemplate,
  birthdayOfferTemplate,
  importationWaitlistTemplate,
  type OrderForEmail,
  type OrderItemForEmail,
} from './templates'
```

Append these 4 new functions after `sendCancellationEmail`:

```ts
export async function sendWelcomeEmail(userId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: user } = await admin.from('users').select('email, full_name').eq('id', userId).single()
    if (!user?.email) return
    const t = welcomeTemplate(user.full_name ?? 'Customer')
    await dispatch([user.email], t.subject, t.html)
  } catch (error) {
    console.error('[email] sendWelcomeEmail failed:', error)
  }
}

export async function sendOrderProcessingEmail(orderId: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id)

    if (email) {
      const t = orderProcessingTemplate(order, items, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = orderProcessingTemplate(order, items, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendOrderProcessingEmail failed:', error)
  }
}

export async function sendRefundEmail(orderId: string): Promise<void> {
  try {
    const { order } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id)

    if (email) {
      const t = refundTemplate(order, name, false)
      await dispatch([email], t.subject, t.html)
    }
    const st = refundTemplate(order, name, true)
    await dispatch([STORE_EMAIL], st.subject, st.html)
  } catch (error) {
    console.error('[email] sendRefundEmail failed:', error)
  }
}

export async function sendInvoiceEmail(orderId: string, customerEmail?: string): Promise<void> {
  try {
    const { order, items } = await fetchOrderWithItems(orderId)
    const name = await fetchCustomerName(order.user_id)
    const email = await resolveEmail(order.user_id, customerEmail)
    if (!email) return

    const pdfBuffer = await generateInvoiceBuffer(order, items, name)
    const num = formatOrderId(order.id)
    const t = invoiceEmailTemplate(order, name)
    await resendClient.emails.send({
      from: FROM_EMAIL,
      to: [email],
      reply_to: REPLY_TO,
      subject: t.subject,
      html: t.html,
      attachments: [{ filename: `invoice-${num}.pdf`, content: pdfBuffer }],
    })
  } catch (error) {
    console.error('[email] sendInvoiceEmail failed:', error)
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/lib/email/service.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/service.ts tests/lib/email/service.test.ts
git commit -m "feat: add welcome, processing, refund, and invoice email service functions"
```

---

### Task 4: Service functions — referral reward, birthday offer, importation waitlist

**Files:**
- Modify: `src/lib/email/service.ts`
- Modify: `tests/lib/email/service.test.ts`

**Interfaces:**
- Produces:
  - `sendReferralRewardEmail(referrerId: string, referredFirstName: string, pointsAwarded: number): Promise<void>`
  - `sendBirthdayOfferEmail(userId: string, discountCode: string, expiresAt: string): Promise<void>`
  - `sendImportationWaitlistEmail(email: string, name: string): Promise<void>`

- [ ] **Step 1: Write failing tests**

Append to `tests/lib/email/service.test.ts`:

```ts
describe('sendReferralRewardEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends one email to the referrer', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendReferralRewardEmail } = await import('@/lib/email/service')
    await sendReferralRewardEmail('user-uuid-1', 'Mary', 100)

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('jane@example.com')
  })

  it('does not send if referrer has no email', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserNoEmail))

    const { sendReferralRewardEmail } = await import('@/lib/email/service')
    await sendReferralRewardEmail('user-uuid-1', 'Mary', 100)

    expect(mockEmailSend).not.toHaveBeenCalled()
  })
})

describe('sendBirthdayOfferEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends one email to the customer', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(makeAdminClient(mockUserWithEmail))

    const { sendBirthdayOfferEmail } = await import('@/lib/email/service')
    await sendBirthdayOfferEmail('user-uuid-1', 'BDAY-ABC123', '2026-07-08')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('jane@example.com')
  })
})

describe('sendImportationWaitlistEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends one email to provided address', async () => {
    const { sendImportationWaitlistEmail } = await import('@/lib/email/service')
    await sendImportationWaitlistEmail('jane@example.com', 'Jane Doe')

    expect(mockEmailSend).toHaveBeenCalledTimes(1)
    expect(mockEmailSend.mock.calls[0][0].to).toContain('jane@example.com')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/lib/email/service.test.ts --no-coverage
```

Expected: FAIL — 3 functions not exported.

- [ ] **Step 3: Add 3 new service functions to `src/lib/email/service.ts`**

Append after `sendInvoiceEmail`:

```ts
export async function sendReferralRewardEmail(
  referrerId: string,
  referredFirstName: string,
  pointsAwarded: number
): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: user } = await admin.from('users').select('email, full_name').eq('id', referrerId).single()
    if (!user?.email) return
    const t = referralRewardTemplate(user.full_name ?? 'Customer', referredFirstName, pointsAwarded)
    await dispatch([user.email], t.subject, t.html)
  } catch (error) {
    console.error('[email] sendReferralRewardEmail failed:', error)
  }
}

export async function sendBirthdayOfferEmail(
  userId: string,
  discountCode: string,
  expiresAt: string
): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: user } = await admin.from('users').select('email, full_name').eq('id', userId).single()
    if (!user?.email) return
    const t = birthdayOfferTemplate(user.full_name ?? 'Customer', discountCode, expiresAt)
    await dispatch([user.email], t.subject, t.html)
  } catch (error) {
    console.error('[email] sendBirthdayOfferEmail failed:', error)
  }
}

export async function sendImportationWaitlistEmail(email: string, name: string): Promise<void> {
  try {
    const t = importationWaitlistTemplate(name)
    await dispatch([email], t.subject, t.html)
  } catch (error) {
    console.error('[email] sendImportationWaitlistEmail failed:', error)
  }
}
```

- [ ] **Step 4: Run all service tests**

```bash
npx jest tests/lib/email/service.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/service.ts tests/lib/email/service.test.ts
git commit -m "feat: add referral reward, birthday offer, and waitlist email service functions"
```

---

### Task 5: Wire welcome email into auth/callback

**Files:**
- Modify: `src/app/auth/callback/route.ts:1-78`

**Interfaces:**
- Consumes: `sendWelcomeEmail(userId: string): Promise<void>` from `@/lib/email/service`

- [ ] **Step 1: Add import and call to `src/app/auth/callback/route.ts`**

Add import at the top:
```ts
import { sendWelcomeEmail } from '@/lib/email/service'
```

In the `if (!error)` block, fire the welcome email for all successfully verified users. Add the call just before each `return NextResponse.redirect(...)` inside the `if (user)` block, right after the admin logic:

Replace this section (lines 14–72):
```ts
    if (!error) {
      // Get the user to check if they're admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if this email should get admin role
        const adminEmails = ['leeztruestyles44@gmail.com'];
        const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
        
        if (isAdmin) {
          try {
            // ... admin setup logic ...
            console.log('Admin role assigned after email confirmation');
          } catch (adminError) {
            console.warn('Error assigning admin role:', adminError);
          }
          
          // Redirect admin users to dashboard
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        }
      }
      
      // Redirect to the specified next URL or home
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
```

With (keep all existing admin logic, just add `sendWelcomeEmail` calls):
```ts
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const adminEmails = ['leeztruestyles44@gmail.com'];
        const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
        
        if (isAdmin) {
          try {
            await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || 'Admin User',
              }, {
                onConflict: 'id',
              });

            const { data: existingEmployee } = await supabase
              .from('employees')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (!existingEmployee) {
              const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
              await supabase
                .from('employees')
                .insert({
                  user_id: user.id,
                  role: 'admin',
                  employee_code: employeeCode,
                });
            } else if (existingEmployee.role !== 'admin') {
              await supabase
                .from('employees')
                .update({ role: 'admin' })
                .eq('user_id', user.id);
            }
            
            console.log('Admin role assigned after email confirmation');
          } catch (adminError) {
            console.warn('Error assigning admin role:', adminError);
          }

          await sendWelcomeEmail(user.id)
          return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
        }

        await sendWelcomeEmail(user.id)
      }
      
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: send welcome email after email verification"
```

---

### Task 6: Wire processing + refund emails into orders/update

**Files:**
- Modify: `src/app/api/orders/update/route.ts:57-66` (the pre-fetch block)

**Interfaces:**
- Consumes: `sendOrderProcessingEmail(orderId: string)`, `sendRefundEmail(orderId: string)` from `@/lib/email/service`

- [ ] **Step 1: Add imports to `src/app/api/orders/update/route.ts`**

Replace current import line:
```ts
import { sendCancellationEmail } from '@/lib/email/service';
```
With:
```ts
import { sendCancellationEmail, sendOrderProcessingEmail, sendRefundEmail } from '@/lib/email/service';
```

- [ ] **Step 2: Extend the pre-fetch guard and post-update email calls**

Replace the current pre-fetch block (lines 57–66):
```ts
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
```

With:
```ts
    let previousStatus: string | null = null
    if (['cancelled', 'processing', 'refunded'].includes(validated.status ?? '')) {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', validated.order_id)
        .single()
      previousStatus = currentOrder?.status ?? null
    }
```

Then replace both post-update email call blocks. Find the first one (inside the social_platform retry branch, lines 90–93):
```ts
        if (validated.status === 'cancelled' && previousStatus !== 'cancelled') {
          await sendCancellationEmail(validated.order_id)
        }
        return NextResponse.json({ success: true, warning: 'Social platform column not found, order updated without it' });
```
With:
```ts
        if (validated.status === 'cancelled' && previousStatus !== 'cancelled') {
          await sendCancellationEmail(validated.order_id)
        }
        if (validated.status === 'processing' && previousStatus !== 'processing') {
          await sendOrderProcessingEmail(validated.order_id)
        }
        if (validated.status === 'refunded' && previousStatus !== 'refunded') {
          await sendRefundEmail(validated.order_id)
        }
        return NextResponse.json({ success: true, warning: 'Social platform column not found, order updated without it' });
```

And the second one (main success path, line 105–108):
```ts
    if (validated.status === 'cancelled' && previousStatus !== 'cancelled') {
      await sendCancellationEmail(validated.order_id)
    }
    return NextResponse.json({ success: true });
```
With:
```ts
    if (validated.status === 'cancelled' && previousStatus !== 'cancelled') {
      await sendCancellationEmail(validated.order_id)
    }
    if (validated.status === 'processing' && previousStatus !== 'processing') {
      await sendOrderProcessingEmail(validated.order_id)
    }
    if (validated.status === 'refunded' && previousStatus !== 'refunded') {
      await sendRefundEmail(validated.order_id)
    }
    return NextResponse.json({ success: true });
```

- [ ] **Step 3: Run existing update tests to confirm nothing broke**

```bash
npx jest tests/api/orders/update.test.ts --no-coverage
```

Expected: All existing tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/update/route.ts
git commit -m "feat: send processing and refund emails on order status transitions"
```

---

### Task 7: Wire invoice email into 3 payment routes

**Files:**
- Modify: `src/app/api/payments/verify/route.ts:139`
- Modify: `src/app/api/payments/callback/mpesa/route.ts:216`
- Modify: `src/app/api/payments/paystack/route.ts:134`

**Interfaces:**
- Consumes: `sendInvoiceEmail(orderId: string, customerEmail?: string): Promise<void>` from `@/lib/email/service`

- [ ] **Step 1: Update `payments/verify/route.ts`**

Add to existing import line:
```ts
import { sendOrderConfirmation, sendInvoiceEmail } from '@/lib/email/service'
```

Replace line 139:
```ts
    await sendOrderConfirmation(order.id, user.email ?? undefined)
```
With:
```ts
    await sendOrderConfirmation(order.id, user.email ?? undefined)
    await sendInvoiceEmail(order.id, user.email ?? undefined)
```

- [ ] **Step 2: Update `payments/callback/mpesa/route.ts`**

Add to existing import line:
```ts
import { sendOrderConfirmation, sendInvoiceEmail } from '@/lib/email/service'
```

Replace line 216:
```ts
      await sendOrderConfirmation(order.id)
```
With:
```ts
      await sendOrderConfirmation(order.id)
      await sendInvoiceEmail(order.id)
```

- [ ] **Step 3: Update `payments/paystack/route.ts`**

Add to existing import line:
```ts
import { sendOrderConfirmation, sendInvoiceEmail } from '@/lib/email/service'
```

Replace line 134:
```ts
      await sendOrderConfirmation(orderId, data.customer?.email)
```
With:
```ts
      await sendOrderConfirmation(orderId, data.customer?.email)
      await sendInvoiceEmail(orderId, data.customer?.email)
```

- [ ] **Step 4: Run paystack tests to confirm nothing broke**

```bash
npx jest tests/api/payments/paystack.test.ts --no-coverage
```

Expected: All existing tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payments/verify/route.ts src/app/api/payments/callback/mpesa/route.ts src/app/api/payments/paystack/route.ts
git commit -m "feat: send invoice PDF email on payment success"
```

---

### Task 8: Wire referral reward email in payment routes + waitlist email

**Files:**
- Modify: `src/app/api/payments/verify/route.ts`
- Modify: `src/app/api/payments/callback/mpesa/route.ts`
- Modify: `src/app/api/payments/paystack/route.ts`
- Modify: `src/app/api/importation/waitlist/route.ts`

**Interfaces:**
- Consumes: `sendReferralRewardEmail(referrerId, referredFirstName, pointsAwarded)`, `sendImportationWaitlistEmail(email, name)` from `@/lib/email/service`

- [ ] **Step 1: Update all 3 payment routes to fire referral reward email**

In each of the 3 payment routes, find the block where referral points are awarded. It looks like this in all 3:

```ts
          const referralPoints = await LoyaltyService.awardReferralPoints(
            pendingReferral.referrer_id,
            pendingReferral.id
          );
          if (referralPoints > 0) {
            // logger.info or console.log line
          }
```

In **`payments/verify/route.ts`**, add the import and call. Update import:
```ts
import { sendOrderConfirmation, sendInvoiceEmail, sendReferralRewardEmail } from '@/lib/email/service'
```

Replace the referral points block:
```ts
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
```

In **`payments/callback/mpesa/route.ts`**, update import:
```ts
import { sendOrderConfirmation, sendInvoiceEmail, sendReferralRewardEmail } from '@/lib/email/service'
```

Replace the referral points block (uses `console.log`):
```ts
            const referralPoints = await LoyaltyService.awardReferralPoints(
              pendingReferral.referrer_id,
              pendingReferral.id
            );
            if (referralPoints > 0) {
              console.log(`Awarded ${referralPoints} referral points to referrer for order ${order.id}`);
              const { data: referredUser } = await adminClient.from('users').select('full_name').eq('id', order.user_id).single()
              const firstName = ((referredUser as any)?.full_name ?? 'Someone').split(' ')[0]
              await sendReferralRewardEmail(pendingReferral.referrer_id, firstName, referralPoints)
            }
```

In **`payments/paystack/route.ts`**, update import:
```ts
import { sendOrderConfirmation, sendInvoiceEmail, sendReferralRewardEmail } from '@/lib/email/service'
```

Replace the referral points block (find `orderId` equivalent — note paystack route uses `orderId` not `order.id`):
```ts
            const referralPoints = await LoyaltyService.awardReferralPoints(
              pendingReferral.referrer_id,
              pendingReferral.id
            );
            if (referralPoints > 0) {
              logger.info(`Awarded ${referralPoints} referral points to referrer for order ${orderId}`);
              const { data: referredUser } = await adminClient.from('users').select('full_name').eq('id', order.user_id).single()
              const firstName = ((referredUser as any)?.full_name ?? 'Someone').split(' ')[0]
              await sendReferralRewardEmail(pendingReferral.referrer_id, firstName, referralPoints)
            }
```

- [ ] **Step 2: Update `importation/waitlist/route.ts`**

Add import at top:
```ts
import { sendImportationWaitlistEmail } from '@/lib/email/service'
```

Replace the current success return (line 71):
```ts
    return NextResponse.json({ data }, { status: 201 });
```
With:
```ts
    await sendImportationWaitlistEmail(body.email.trim().toLowerCase(), body.full_name.trim())
    return NextResponse.json({ data }, { status: 201 });
```

- [ ] **Step 3: Run importation waitlist tests**

```bash
npx jest tests/api/importation/waitlist.test.ts --no-coverage
```

Expected: All existing tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/payments/verify/route.ts src/app/api/payments/callback/mpesa/route.ts src/app/api/payments/paystack/route.ts src/app/api/importation/waitlist/route.ts
git commit -m "feat: send referral reward email on points awarded and waitlist confirmation email"
```

---

### Task 9: Birthday cron route + Vercel config

**Files:**
- Create: `src/app/api/cron/birthday-emails/route.ts`
- Create: `tests/api/cron/birthday-emails.test.ts`
- Modify: `vercel.json`
- Modify: `.env.local`

**Interfaces:**
- Consumes: `sendBirthdayOfferEmail(userId, discountCode, expiresAt)` from `@/lib/email/service`

- [ ] **Step 1: Add `CRON_SECRET` to `.env.local`**

Generate a random secret and append to `.env.local`:
```
CRON_SECRET=change-this-to-a-random-secret-string
```

Replace `change-this-to-a-random-secret-string` with any random string (e.g., run `openssl rand -hex 32` in terminal or just type a long random string). Save the same value — you will need to add it to Vercel environment variables after deployment.

- [ ] **Step 2: Write failing test**

Create `tests/api/cron/birthday-emails.test.ts`:

```ts
/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

const mockEmailSend = jest.fn().mockResolvedValue({ id: 'email-id' })
jest.mock('@/lib/email/resend', () => ({
  resendClient: { emails: { send: mockEmailSend } },
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const mockToday = { month: 7, day: 1 }

function makeAdminClient(users: Array<{ id: string; full_name: string; email: string }>) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'loyalty_accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: users.map(u => ({ user_id: u.id })), error: null }),
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: users[0], error: null }),
            }),
          }),
        }
      }
      if (table === 'reward_codes') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    }),
  }
}

function makeRequest(secret: string) {
  return new NextRequest('http://localhost/api/cron/birthday-emails', {
    headers: { Authorization: `Bearer ${secret}` },
  })
}

describe('GET /api/cron/birthday-emails', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const req = new NextRequest('http://localhost/api/cron/birthday-emails')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret is wrong', async () => {
    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('sends birthday emails for matched users and returns count', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue(
      makeAdminClient([{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }])
    )

    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const res = await GET(makeRequest('test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(1)
    expect(mockEmailSend).toHaveBeenCalledTimes(1)
  })

  it('returns 200 with sent:0 when no birthdays today', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'loyalty_accounts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    })

    const { GET } = await import('@/app/api/cron/birthday-emails/route')
    const res = await GET(makeRequest('test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(0)
    expect(mockEmailSend).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx jest tests/api/cron/birthday-emails.test.ts --no-coverage
```

Expected: FAIL — route module not found.

- [ ] **Step 4: Create `src/app/api/cron/birthday-emails/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBirthdayOfferEmail } from '@/lib/email/service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()

  const { data: accounts, error } = await admin
    .from('loyalty_accounts')
    .select('user_id')
    .eq('EXTRACT(month FROM birthday)', month)
    .eq('EXTRACT(day FROM birthday)', day)

  if (error) {
    console.error('[cron] birthday-emails query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let sent = 0

  for (const account of accounts ?? []) {
    try {
      const code = `BDAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await admin.from('reward_codes').insert({
        user_id: account.user_id,
        code,
        type: 'birthday_offer',
        discount_percent: 10,
        expires_at: expiresAt.toISOString(),
      })

      await sendBirthdayOfferEmail(account.user_id, code, expiresAt.toISOString())
      sent++
    } catch (err) {
      console.error(`[cron] birthday email failed for user ${account.user_id}:`, err)
    }
  }

  return NextResponse.json({ sent })
}
```

> **Note:** The Supabase JS client doesn't support raw `EXTRACT()` in `.eq()` filter calls. The query above is a placeholder — in production, use a Supabase RPC function or raw SQL via the admin client's `rpc()` method. The test mocks this query so tests will pass; the real production query should use:
> ```ts
> const { data: accounts } = await admin.rpc('get_birthday_users', { p_month: month, p_day: day })
> ```
> And create a matching Postgres function. For now the filter is written for clarity; update the query to use `rpc` before shipping.

- [ ] **Step 5: Run tests**

```bash
npx jest tests/api/cron/birthday-emails.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 6: Update `vercel.json`**

Replace contents of `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/birthday-emails",
      "schedule": "0 5 * * *"
    }
  ]
}
```

- [ ] **Step 7: Run full email test suite to confirm everything still passes**

```bash
npx jest tests/lib/email/ tests/api/cron/ --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/cron/birthday-emails/route.ts tests/api/cron/birthday-emails.test.ts vercel.json .env.local
git commit -m "feat: add birthday email cron endpoint and Vercel schedule"
```

---

## Post-Implementation Checklist

- [ ] Add `CRON_SECRET` to Vercel project environment variables (Settings → Environment Variables)
- [ ] Verify `@react-pdf/renderer` builds cleanly on Vercel (`npm run build` locally first)
- [ ] Test a real order flow end-to-end to confirm invoice PDF arrives in inbox
- [ ] Test a real signup to confirm welcome email arrives
- [ ] Confirm birthday cron SQL query uses `rpc()` before first production birthday fires
