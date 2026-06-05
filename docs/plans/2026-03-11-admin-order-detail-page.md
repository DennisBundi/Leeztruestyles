# Admin Order Detail Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the missing `/dashboard/orders/[id]` page so admins can view full order details after clicking "View Details" in the orders list.

**Architecture:** Add a new API route `GET /api/orders/[id]` (admin-only) that fetches a single order with its items and customer info, then create the admin detail page that calls it and renders the data with a status-update control.

**Tech Stack:** Next.js App Router, Supabase server client + admin client, TypeScript, Tailwind, `zod` for validation.

---

### Task 1: Create `GET /api/orders/[id]/route.ts`

**Files:**
- Create: `src/app/api/orders/[id]/route.ts`

**Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatOrderId } from '@/lib/utils/orderId'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole || userRole === 'seller') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Fetch order with items and products
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        payment_method,
        sale_type,
        created_at,
        user_id,
        seller_id,
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
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Fetch customer info
    let customer = { full_name: 'Guest Customer', email: 'N/A', phone: null as string | null }
    if (order.user_id) {
      const { data: userData } = await adminClient
        .from('users')
        .select('full_name, email, phone')
        .eq('id', order.user_id)
        .single()
      if (userData) customer = userData
    }

    // Fetch seller info
    let seller: string | null = null
    if (order.seller_id) {
      const { data: empData } = await adminClient
        .from('employees')
        .select('employee_code')
        .eq('id', order.seller_id)
        .single()
      if (empData) seller = empData.employee_code
    }

    return NextResponse.json({
      order: {
        id: order.id,
        order_number: formatOrderId(order.id),
        date: order.created_at,
        status: order.status,
        payment_method: order.payment_method ?? 'N/A',
        sale_type: order.sale_type ?? 'online',
        total_amount: Number(order.total_amount ?? 0),
        customer,
        seller,
        items: (order.order_items ?? []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name ?? 'Unknown Product',
          product_image: item.products?.images?.[0] ?? null,
          size: item.size ?? null,
          color: item.color ?? null,
          quantity: item.quantity,
          unit_price: Number(item.price ?? 0),
        })),
      },
    })
  } catch (error) {
    console.error('Order detail fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/orders/[id]/route.ts
git commit -m "feat: add GET /api/orders/[id] admin order detail endpoint"
```

---

### Task 2: Create the admin order detail page

**Files:**
- Create: `src/app/(admin)/dashboard/orders/[id]/page.tsx`

**Step 1: Create the page**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'

interface AdminOrderDetail {
  id: string
  order_number: string
  date: string
  status: OrderStatus
  payment_method: string
  sale_type: string
  total_amount: number
  customer: {
    full_name: string
    email: string
    phone: string | null
  }
  seller: string | null
  items: {
    id: string
    product_id: string
    product_name: string
    product_image: string | null
    size: string | null
    color: string | null
    quantity: number
    unit_price: number
  }[]
}

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'processing', 'completed', 'cancelled', 'refunded']

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
}

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = Array.isArray(params.id) ? params.id[0] : (params.id ?? '')

  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        return
      }
      fetch(`/api/orders/${orderId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setOrder(data.order)
        })
        .catch((e) => setError(e.message ?? 'Failed to load order.'))
        .finally(() => setLoading(false))
    })
  }, [orderId, router])

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!order || newStatus === order.status) return
    setUpdatingStatus(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/orders/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Update failed')
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev)
      setStatusMsg('Status updated.')
    } catch (e: any) {
      setStatusMsg(e.message ?? 'Failed to update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-gray-700">
          ← Orders
        </Link>
        <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-2xl">{error ?? 'Order not found.'}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-gray-700">
          ← Orders
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
      </div>

      {/* Order Meta */}
      <div className="bg-white shadow rounded-2xl p-6 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-medium text-gray-900">
              {new Date(order.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Payment</p>
            <p className="font-medium text-gray-900 uppercase">{order.payment_method}</p>
          </div>
          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-medium text-gray-900 capitalize">{order.sale_type}</p>
          </div>
          {order.seller && (
            <div>
              <p className="text-gray-500">Seller</p>
              <p className="font-medium text-gray-900">{order.seller}</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white shadow rounded-2xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Customer</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{order.customer.full_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{order.customer.email}</p>
          </div>
          {order.customer.phone && (
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{order.customer.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Update */}
      <div className="bg-white shadow rounded-2xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={updatingStatus || s === order.status}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                s === order.status
                  ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {s}
            </button>
          ))}
        </div>
        {statusMsg && <p className="mt-2 text-xs text-gray-500">{statusMsg}</p>}
      </div>

      {/* Items */}
      <div className="bg-white shadow rounded-2xl p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Items ({order.items.length})</h2>
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V6.75A1.5 1.5 0 0021 5.25H3A1.5 1.5 0 001.5 6.75v12c0 .828.672 1.5 1.5 1.5z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.size && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.size}</span>
                  )}
                  {item.color && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.color}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Qty: {item.quantity} × KSh {item.unit_price.toLocaleString('en-KE')}
                </p>
              </div>
              <p className="font-semibold text-gray-900 flex-shrink-0">
                KSh {(item.quantity * item.unit_price).toLocaleString('en-KE')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="bg-white shadow rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900">Order Total</span>
          <span className="text-xl font-bold text-gray-900">
            KSh {order.total_amount.toLocaleString('en-KE')}
          </span>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/(admin)/dashboard/orders/[id]/page.tsx
git commit -m "feat: add admin order detail page at /dashboard/orders/[id]"
```

---

### Task 3: Create PR, review, and push

**Step 1: Push branch and open PR**

```bash
git push origin main
```

Since this project uses single-branch workflow (direct to main), verify build passes then confirm with user before pushing live.
