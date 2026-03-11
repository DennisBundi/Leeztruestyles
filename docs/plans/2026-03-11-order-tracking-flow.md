# Order Tracking Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend order statuses to reflect the full delivery lifecycle — `pending → paid → shipped → delivered` — so customers can track their order in real time and confirm receipt.

**Architecture:** Add `paid`, `shipped`, `delivered` to the DB constraint and all status enums; update payment callbacks to set `paid` (instead of `completed`) on success; add a customer-only `POST /api/orders/[id]/deliver` endpoint; update the customer timeline UI and admin status buttons.

**Tech Stack:** Next.js App Router, Supabase admin client, TypeScript, Zod, Tailwind, Jest.

---

### Task 1: Database migration — add new statuses

**Files:**
- Create: `supabase/migrations/20260311_order_status_extend.sql`

**Step 1: Create migration file**

```sql
-- Extend orders.status CHECK constraint to include paid, shipped, delivered
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'processing', 'completed',
    'cancelled', 'refunded',
    'paid', 'shipped', 'delivered'
  ));
```

**Step 2: Apply the migration**

```bash
npx supabase db push --include-all
```

Expected: migration applies cleanly with no errors.

**Step 3: Commit**

```bash
git add supabase/migrations/20260311_order_status_extend.sql
git commit -m "feat: extend orders.status constraint with paid, shipped, delivered"
```

---

### Task 2: Update OrderStatus type and customer status styles

**Files:**
- Modify: `src/app/(marketplace)/profile/orders/types.ts`

**Step 1: Open the file**

Current content of `types.ts`:

```ts
export const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-gray-100 text-gray-600',
}

export type CustomerOrder = {
  ...
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  ...
}
```

**Step 2: Apply changes**

Replace `STATUS_STYLES` and `CustomerOrder.status`:

```ts
export const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-gray-100 text-gray-600',
  paid: 'bg-emerald-100 text-emerald-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
}

export type CustomerOrder = {
  id: string
  order_number: string
  date: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'paid' | 'shipped' | 'delivered'
  payment_method: string
  total_amount: number
  items: CustomerOrderItem[]
}
```

**Step 3: Commit**

```bash
git add src/app/(marketplace)/profile/orders/types.ts
git commit -m "feat: add paid, shipped, delivered to CustomerOrder status type"
```

---

### Task 3: Update the admin order status enum (Zod + UI)

**Files:**
- Modify: `src/app/api/orders/update/route.ts`
- Modify: `src/app/(admin)/dashboard/orders/[id]/page.tsx`

**Step 1: Update Zod enum in `update/route.ts`**

Find line 12:
```ts
status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'refunded']).optional(),
```

Replace with:
```ts
status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'refunded', 'paid', 'shipped', 'delivered']).optional(),
```

**Step 2: Update admin page constants**

In `src/app/(admin)/dashboard/orders/[id]/page.tsx`, find:

```ts
type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
}

const ALL_STATUSES: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled', 'refunded']
```

Replace with:

```ts
type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'paid' | 'shipped' | 'delivered'

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
  paid: 'bg-emerald-100 text-emerald-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
}

const ALL_STATUSES: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled', 'refunded', 'paid', 'shipped', 'delivered']
```

**Step 3: Commit**

```bash
git add src/app/api/orders/update/route.ts src/app/(admin)/dashboard/orders/[id]/page.tsx
git commit -m "feat: add paid, shipped, delivered to admin status controls and Zod schema"
```

---

### Task 4: Update payment callbacks — `completed` → `paid`

**Files:**
- Modify: `src/app/api/payments/verify/route.ts`
- Modify: `src/app/api/payments/callback/mpesa/route.ts`

**Step 1: Update Paystack verify (`verify/route.ts`)**

Find line 67 (idempotency check):
```ts
if (order.status === 'completed') {
```
Replace with:
```ts
if (order.status === 'paid') {
```

Find line 74 (status update):
```ts
await adminClient
  .from('orders')
  .update({ status: 'completed' })
  .eq('id', order.id);
```
Replace with:
```ts
await adminClient
  .from('orders')
  .update({ status: 'paid' })
  .eq('id', order.id);
```

**Step 2: Update M-Pesa callback (`callback/mpesa/route.ts`)**

Find line 72 (idempotency check):
```ts
if (order.status === 'completed' && ResultCode === 0) {
```
Replace with:
```ts
if (order.status === 'paid' && ResultCode === 0) {
```

Find line 108–114 (status update on success):
```ts
const { error: updateError } = await adminClient
  .from('orders')
  .update({
    status: 'completed',
    payment_reference: mpesaReceiptNumber || CheckoutRequestID,
  })
  .eq('id', order.id);
```
Replace `status: 'completed'` with `status: 'paid'`:
```ts
const { error: updateError } = await adminClient
  .from('orders')
  .update({
    status: 'paid',
    payment_reference: mpesaReceiptNumber || CheckoutRequestID,
  })
  .eq('id', order.id);
```

**Step 3: Commit**

```bash
git add src/app/api/payments/verify/route.ts src/app/api/payments/callback/mpesa/route.ts
git commit -m "feat: payment success sets order status to paid instead of completed"
```

---

### Task 5: Create `POST /api/orders/[id]/deliver` endpoint

This endpoint lets a logged-in customer confirm they received their order (status `shipped` → `delivered`).

**Files:**
- Create: `src/app/api/orders/[id]/deliver/route.ts`
- Create: `tests/api/orders/deliver.test.ts`

**Step 1: Write the failing test**

```ts
/** @jest-environment node */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

const mockOrder = {
  id: 'order-uuid-1',
  user_id: 'user-1',
  status: 'shipped',
}

// Chained builder mock — mirrors pattern used in other API tests in this codebase
const mockSingle = jest.fn()
const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq })

const mockAdminClient: any = {
  from: jest.fn().mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
  }),
}

const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    }),
  },
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}))

describe('POST /api/orders/[id]/deliver', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSingle.mockResolvedValue({ data: mockOrder, error: null })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockUpdateEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockAdminClient.from.mockReturnValue({ select: mockSelect, update: mockUpdate })
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when order not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when order belongs to a different user', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...mockOrder, user_id: 'other-user' }, error: null })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 409 when order is not in shipped status', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...mockOrder, status: 'paid' }, error: null })
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    expect(res.status).toBe(409)
  })

  it('marks a shipped order as delivered', async () => {
    const { POST } = await import('@/app/api/orders/[id]/deliver/route')
    const req = new NextRequest('http://localhost/api/orders/order-uuid-1/deliver', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'order-uuid-1' }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'delivered' })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx jest tests/api/orders/deliver.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/orders/[id]/deliver/route'`

**Step 3: Create the endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: order, error: fetchError } = await adminClient
      .from('orders')
      .select('id, user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'shipped') {
      return NextResponse.json(
        { error: 'Order must be in shipped status to confirm delivery' },
        { status: 409 }
      )
    }

    const { error: updateError } = await adminClient
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', id)

    if (updateError) {
      console.error('Deliver update error:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deliver endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx jest tests/api/orders/deliver.test.ts --no-coverage
```

Expected: PASS — all 5 tests green.

**Step 5: Commit**

```bash
git add src/app/api/orders/[id]/deliver/route.ts tests/api/orders/deliver.test.ts
git commit -m "feat: add POST /api/orders/[id]/deliver customer delivery confirmation endpoint"
```

---

### Task 6: Update customer order detail page

Update the `StatusTimeline` steps and add a "Mark as Received" button when the order is `shipped`.

**Files:**
- Modify: `src/app/(marketplace)/profile/orders/[id]/page.tsx`

**Step 1: Update `TIMELINE_STEPS` and `TERMINAL_STATUSES`**

Find:
```ts
const TIMELINE_STEPS: Array<CustomerOrder['status']> = ['pending', 'processing', 'completed']
const TERMINAL_STATUSES: Array<CustomerOrder['status']> = ['cancelled', 'refunded']
```

Replace with:
```ts
const TIMELINE_STEPS: Array<CustomerOrder['status']> = ['pending', 'paid', 'shipped', 'delivered']
const TERMINAL_STATUSES: Array<CustomerOrder['status']> = ['cancelled', 'refunded']
```

**Step 2: Add state for the deliver action**

In `OrderDetailPage`, find the existing `useState` declarations and add two new ones after `const [error, setError] = useState<string | null>(null)`:

```ts
const [delivering, setDelivering] = useState(false)
const [deliverError, setDeliverError] = useState<string | null>(null)
```

**Step 3: Add `handleMarkDelivered` function**

Add this function after the `useEffect` block:

```ts
async function handleMarkDelivered() {
  if (!order || delivering) return
  setDelivering(true)
  setDeliverError(null)
  try {
    const res = await fetch(`/api/orders/${orderId}/deliver`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to confirm delivery')
    setOrder((prev) => prev ? { ...prev, status: 'delivered' } : prev)
  } catch (err: unknown) {
    setDeliverError(err instanceof Error ? err.message : 'Failed to confirm delivery')
  } finally {
    setDelivering(false)
  }
}
```

**Step 4: Add "Mark as Received" button in the Status card**

The Status Timeline card currently looks like:
```tsx
{/* Status Timeline */}
<div className="bg-white shadow rounded-2xl p-6 mb-4">
  <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h2>
  <StatusTimeline status={order.status} />
</div>
```

Replace with:
```tsx
{/* Status Timeline */}
<div className="bg-white shadow rounded-2xl p-6 mb-4">
  <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h2>
  <StatusTimeline status={order.status} />
  {order.status === 'shipped' && (
    <div className="mt-4">
      <button
        onClick={handleMarkDelivered}
        disabled={delivering}
        className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {delivering ? 'Confirming...' : 'Mark as Received'}
      </button>
      {deliverError && (
        <p className="mt-2 text-xs text-red-600">{deliverError}</p>
      )}
    </div>
  )}
</div>
```

**Step 5: Update "Write a Review" to also show for `delivered`**

Find:
```tsx
{order.status === 'completed' && (
  <Link ...>Write a Review</Link>
)}
```

Replace with:
```tsx
{(order.status === 'completed' || order.status === 'delivered') && (
  <Link ...>Write a Review</Link>
)}
```

**Step 6: Commit**

```bash
git add src/app/(marketplace)/profile/orders/[id]/page.tsx
git commit -m "feat: update customer order timeline to paid/shipped/delivered with mark-as-received button"
```

---

### Task 7: Verify TypeScript compiles cleanly

```bash
npx tsc --noEmit
```

Fix any type errors that surface (e.g. `switch` statements or `Record` types that don't cover the new statuses). Commit any fixes:

```bash
git add -p
git commit -m "fix: type errors from new order statuses"
```

---

### Task 8: Run full test suite and confirm no regressions

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: same pass/fail count as before (26 pre-existing failures, 7 suites passing). No new failures introduced.

If new failures appear, investigate and fix before proceeding.
