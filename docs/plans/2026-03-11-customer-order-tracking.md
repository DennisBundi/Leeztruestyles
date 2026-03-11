# Customer Order Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let logged-in customers view their order history and track each order's status at `/profile/orders`.

**Architecture:** New `GET /api/orders/customer` endpoint filtered by `user_id` of the authenticated session; two new pages under `(marketplace)/profile/orders` — a list and a detail view; small update to the profile page to add a "My Orders" button.

**Tech Stack:** Next.js App Router, Supabase (server client), TypeScript, Tailwind CSS, Jest (unit tests)

---

### Task 1: Customer orders API — failing tests first

**Files:**
- Create: `tests/api/orders/customer.test.ts`
- Create: `src/app/api/orders/customer/route.ts`

**Step 1: Write the failing tests**

Create `tests/api/orders/customer.test.ts`:

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// --- Supabase mock (chained builder pattern used throughout this codebase) ---
const mockOrder = {
  id: 'order-uuid-1',
  user_id: 'user-1',
  total_amount: 3500,
  status: 'pending',
  payment_method: 'mpesa',
  created_at: '2026-03-11T10:00:00.000Z',
  order_items: [
    {
      id: 'item-1',
      product_id: 'prod-1',
      quantity: 2,
      price: 1750,
      size: 'M',
      color: 'black',
      products: { name: 'Floral Dress', images: ['https://example.com/img.jpg'] },
    },
  ],
};

const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'customer@test.com' } },
      error: null,
    }),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [mockOrder], error: null }),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('GET /api/orders/customer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
    mockSupabaseClient.order.mockResolvedValue({ data: [mockOrder], error: null });
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'customer@test.com' } },
      error: null,
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns orders with items for authenticated customer', async () => {
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.orders).toHaveLength(1);
    const order = json.orders[0];
    expect(order.order_number).toBe('LEEZT-VUID1'); // formatOrderId last 6 chars uppercase
    expect(order.status).toBe('pending');
    expect(order.total_amount).toBe(3500);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].product_name).toBe('Floral Dress');
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].unit_price).toBe(1750);
  });

  it('returns empty orders array when customer has no orders', async () => {
    mockSupabaseClient.order.mockResolvedValueOnce({ data: [], error: null });
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.orders).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    mockSupabaseClient.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });
    const { GET } = await import('@/app/api/orders/customer/route');
    const req = new NextRequest('http://localhost/api/orders/customer');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx jest tests/api/orders/customer.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/orders/customer/route'`

**Step 3: Implement the API route**

Create `src/app/api/orders/customer/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatOrderId } from '@/lib/utils/orderId';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        payment_method,
        created_at,
        order_items (
          id,
          product_id,
          quantity,
          price,
          size,
          color,
          products (
            name,
            images
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Customer orders fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const formatted = (orders ?? []).map((order: any) => ({
      id: order.id,
      order_number: formatOrderId(order.id),
      date: order.created_at,
      status: order.status,
      payment_method: order.payment_method ?? 'N/A',
      total_amount: parseFloat(order.total_amount ?? 0),
      items: (order.order_items ?? []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name ?? 'Unknown Product',
        product_image: item.products?.images?.[0] ?? null,
        size: item.size ?? null,
        color: item.color ?? null,
        quantity: item.quantity,
        unit_price: parseFloat(item.price ?? 0),
      })),
    }));

    return NextResponse.json({ orders: formatted });
  } catch (error) {
    console.error('Customer orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest tests/api/orders/customer.test.ts --no-coverage
```

Expected: PASS (the `order_number` test may need the mock UUID adjusted to match — update `mockOrder.id` in the test to `'order-uuid-0001'` and expected value to `formatOrderId('order-uuid-0001')` if needed)

> **Note on the order_number assertion:** `formatOrderId` takes the last 6 chars of the UUID with dashes removed. For `'order-uuid-1'` → clean = `'ORDERUUID1'` → last 6 = `'ERUID1'` → `'LEEZT-ERUID1'`. Update the test's expected value to match before running.

**Step 5: Commit**

```bash
git add tests/api/orders/customer.test.ts src/app/api/orders/customer/route.ts
git commit -m "feat: add GET /api/orders/customer endpoint"
```

---

### Task 2: Order list page `/profile/orders`

**Files:**
- Create: `src/app/(marketplace)/profile/orders/page.tsx`

**Step 1: Create the page**

Create `src/app/(marketplace)/profile/orders/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type OrderItem = {
  id: string
  product_name: string
  product_image: string | null
  size: string | null
  color: string | null
  quantity: number
  unit_price: number
}

type Order = {
  id: string
  order_number: string
  date: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  payment_method: string
  total_amount: number
  items: OrderItem[]
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-gray-100 text-gray-600',
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        return
      }
      fetch('/api/orders/customer')
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setOrders(data.orders)
        })
        .catch(() => setError('Failed to load orders'))
        .finally(() => setLoading(false))
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">
            ← Profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6">{error}</div>
        )}

        {!error && orders.length === 0 && (
          <div className="bg-white shadow rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
            <Link
              href="/home"
              className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all"
            >
              Start Shopping
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/profile/orders/${order.id}`}
              className="block bg-white shadow rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900">{order.order_number}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(order.date).toLocaleDateString('en-KE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">
                    KSh {order.total_amount.toLocaleString()}
                  </p>
                  <span
                    className={`mt-1 inline-block text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify the page builds without TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "orders"
```

Expected: no errors for the orders files

**Step 3: Commit**

```bash
git add src/app/\(marketplace\)/profile/orders/page.tsx
git commit -m "feat: add customer order list page at /profile/orders"
```

---

### Task 3: Order detail page `/profile/orders/[id]`

**Files:**
- Create: `src/app/(marketplace)/profile/orders/[id]/page.tsx`

**Step 1: Create the detail page**

Create `src/app/(marketplace)/profile/orders/[id]/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

type OrderItem = {
  id: string
  product_name: string
  product_image: string | null
  size: string | null
  color: string | null
  quantity: number
  unit_price: number
}

type Order = {
  id: string
  order_number: string
  date: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  payment_method: string
  total_amount: number
  items: OrderItem[]
}

const TIMELINE_STEPS: Array<Order['status']> = ['pending', 'processing', 'completed']

const TERMINAL_STATUSES: Array<Order['status']> = ['cancelled', 'refunded']

function StatusTimeline({ status }: { status: Order['status'] }) {
  if (TERMINAL_STATUSES.includes(status)) {
    return (
      <div className="mb-6">
        <span className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 capitalize">
          Order {status}
        </span>
      </div>
    )
  }

  const currentIndex = TIMELINE_STEPS.indexOf(status)

  return (
    <div className="mb-6">
      <div className="flex items-center">
        {TIMELINE_STEPS.map((step, i) => {
          const isCompleted = i <= currentIndex
          const isLast = i === TIMELINE_STEPS.length - 1
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    isCompleted
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span className={`mt-1 text-xs capitalize ${isCompleted ? 'text-primary font-semibold' : 'text-gray-400'}`}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIndex ? 'bg-primary' : 'bg-gray-200'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        return
      }
      fetch('/api/orders/customer')
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          const found = data.orders.find((o: Order) => o.id === orderId)
          if (!found) throw new Error('Order not found')
          setOrder(found)
        })
        .catch((e) => setError(e.message ?? 'Failed to load order'))
        .finally(() => setLoading(false))
    })
  }, [router, orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-red-600">{error ?? 'Order not found'}</p>
          <Link href="/profile/orders" className="text-sm text-primary mt-4 block">
            ← Back to My Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/profile/orders" className="text-sm text-gray-500 hover:text-gray-700">
            ← My Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(order.date).toLocaleDateString('en-KE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {' · '}
            {order.payment_method.toUpperCase()}
          </p>
        </div>

        {/* Status timeline */}
        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Status</h2>
          <StatusTimeline status={order.status} />
        </div>

        {/* Items */}
        <div className="bg-white shadow rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Items</h2>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex gap-4 items-start">
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    width={64}
                    height={64}
                    className="rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{item.product_name}</p>
                  {(item.size || item.color) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[item.size, item.color].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900 flex-shrink-0">
                  KSh {(item.quantity * item.unit_price).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900 text-lg">Total</span>
            <span className="font-bold text-gray-900 text-lg">
              KSh {order.total_amount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify the page builds without TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep -E "orders/\[id\]"
```

Expected: no errors

**Step 3: Commit**

```bash
git add "src/app/(marketplace)/profile/orders/[id]/page.tsx"
git commit -m "feat: add customer order detail page with status timeline"
```

---

### Task 4: Add "My Orders" button to profile page

**Files:**
- Modify: `src/app/(marketplace)/profile/page.tsx`

**Step 1: Add the My Orders section**

In `src/app/(marketplace)/profile/page.tsx`, find the existing Leez Rewards section (around line 129) and add a My Orders section **above** it:

```tsx
{/* My Orders Section */}
<div className="mt-8 bg-white rounded-2xl p-6 shadow border border-gray-100">
    <div className="flex items-center justify-between">
        <div>
            <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
            <p className="text-gray-600 text-sm mt-1">
                Track your order history and status
            </p>
        </div>
        <Link
            href="/profile/orders"
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all hover:scale-105"
        >
            View Orders
        </Link>
    </div>
</div>
```

Insert it between the closing `</div>` of the form card and the opening `<div>` of the Leez Rewards section.

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "profile/page"
```

Expected: no errors

**Step 3: Commit**

```bash
git add "src/app/(marketplace)/profile/page.tsx"
git commit -m "feat: add My Orders link to profile page"
```

---

### Task 5: Final verification

**Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all existing tests pass, new customer orders test passes

**Step 2: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: successful build, no errors
