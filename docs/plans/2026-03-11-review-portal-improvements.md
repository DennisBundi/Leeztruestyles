# Review Portal Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four gaps in the customer review experience: a missing order detail page (currently 404), no review entry point from orders, no "My Reviews" page, and dead code in ReviewForm.

**Architecture:** All changes are frontend-only (no new API routes needed). The order detail page reuses data from the existing `/api/orders/customer` endpoint. The My Reviews page consumes the existing `/api/reviews/my` endpoint. The profile page gets a new card linking to reviews. ReviewForm gets a dead code cleanup.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS. Primary color = `#f9a8d4`, primary-dark = `#f472b6`, primary-light = `#fbcfe8`.

---

## UI Design Reference

All new pages follow this established pattern from `/profile/orders/page.tsx`:

```tsx
// Layout wrapper
<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-3xl mx-auto">
    {/* Back nav */}
    <div className="mb-6 flex items-center gap-4">
      <Link href="/profile/orders" className="text-sm text-gray-500 hover:text-gray-700">
        ← My Orders
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
    </div>
    {/* Cards: bg-white shadow rounded-2xl p-6 */}
  </div>
</div>
```

Status badge colors (reused across order detail and reviews):
- `pending` → `bg-yellow-100 text-yellow-800`
- `processing` → `bg-blue-100 text-blue-800`
- `completed` → `bg-green-100 text-green-800`
- `cancelled` / `refunded` → `bg-gray-100 text-gray-600`
- `approved` (review) → `bg-green-100 text-green-700`

---

## Task 1: Order Detail Page

**Files:**
- Create: `src/app/(marketplace)/profile/orders/[id]/page.tsx`

This page:
1. Fetches all orders from `/api/orders/customer`, finds the one matching `params.id`
2. Shows order header (number, status badge, date, payment method)
3. Lists each item with thumbnail, name, size/color, qty × price
4. For `completed` orders: shows a pink "Write a Review →" link per item to `/products/[product_id]`
5. Shows order total at bottom

**Step 1: Create the file**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type OrderItem = {
  id: string
  product_id: string
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
          const found = (data.orders as Order[]).find((o) => o.id === orderId)
          if (!found) {
            setError('Order not found.')
          } else {
            setOrder(found)
          }
        })
        .catch(() => setError('Failed to load order.'))
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/profile/orders" className="text-sm text-gray-500 hover:text-gray-700">
              ← My Orders
            </Link>
          </div>
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl">{error ?? 'Order not found.'}</div>
        </div>
      </div>
    )
  }

  const isCompleted = order.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile/orders" className="text-sm text-gray-500 hover:text-gray-700">
            ← My Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
        </div>

        {/* Order Meta Card */}
        <div className="bg-white shadow rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                {new Date(order.date).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-500 capitalize">
                Payment: <span className="text-gray-700 font-medium">{order.payment_method}</span>
              </p>
            </div>
            <span
              className={`text-sm font-semibold px-3 py-1.5 rounded-full capitalize ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Items Card */}
        <div className="bg-white shadow rounded-2xl p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Items ({order.items.length})
          </h2>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
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

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.product_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {item.size && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.color}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Qty: {item.quantity} × KSh {item.unit_price.toLocaleString('en-KE')}
                  </p>
                  {/* Review CTA — only for completed orders */}
                  {isCompleted && (
                    <Link
                      href={`/products/${item.product_id}`}
                      className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-primary-dark hover:text-primary transition-colors"
                    >
                      Write a Review
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  )}
                </div>

                {/* Line total */}
                <p className="font-semibold text-gray-900 flex-shrink-0">
                  KSh {(item.quantity * item.unit_price).toLocaleString('en-KE')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Total */}
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-900">Order Total</span>
            <span className="text-xl font-bold text-gray-900">
              KSh {order.total_amount.toLocaleString('en-KE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify the page renders**

Navigate to `/profile/orders` in the browser, click any order card — it should now open the detail page instead of 404ing.

**Step 3: Commit**

```bash
git add src/app/\(marketplace\)/profile/orders/\[id\]/page.tsx
git commit -m "feat: add order detail page with review CTAs"
```

---

## Task 2: My Reviews Page

**Files:**
- Create: `src/app/(marketplace)/profile/reviews/page.tsx`

This page:
1. Fetches `GET /api/reviews/my` (returns `{ data: Review[] }`)
2. Shows filter tabs: All / Pending / Approved
3. Each review card: product name, star rating (readonly), text snippet (2 lines), status badge, date
4. Empty state with "Start Shopping →" CTA

**Step 1: Create the file**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StarRating from '@/components/reviews/StarRating'

type MyReview = {
  id: string
  product_id: string
  product_name: string
  rating: number
  text: string
  status: 'pending' | 'approved'
  image_urls: string[]
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Under Review',
  approved: 'Published',
}

type FilterTab = 'all' | 'pending' | 'approved'

export default function MyReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<MyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin')
        return
      }
      fetch('/api/reviews/my')
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setReviews(data.data ?? [])
        })
        .catch(() => setError('Failed to load your reviews.'))
        .finally(() => setLoading(false))
    })
  }, [router])

  const filtered = tab === 'all' ? reviews : reviews.filter((r) => r.status === tab)

  const tabCount = (t: FilterTab) =>
    t === 'all' ? reviews.length : reviews.filter((r) => r.status === t).length

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
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">
            ← Profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6">{error}</div>
        )}

        {/* Filter Tabs */}
        {reviews.length > 0 && (
          <div className="flex gap-2 mb-5">
            {(['all', 'pending', 'approved'] as FilterTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-primary-dark text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="ml-1.5 text-xs opacity-70">({tabCount(t)})</span>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && filtered.length === 0 && (
          <div className="bg-white shadow rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary-dark" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">
              {tab === 'all' ? "You haven't written any reviews yet." : `No ${tab} reviews.`}
            </p>
            {tab === 'all' && (
              <p className="text-gray-400 text-sm mb-5">
                Shop and share your experience to earn loyalty points.
              </p>
            )}
            {tab === 'all' && (
              <Link
                href="/home"
                className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all"
              >
                Start Shopping
              </Link>
            )}
          </div>
        )}

        {/* Review Cards */}
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className="bg-white shadow rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${review.product_id}`}
                    className="font-semibold text-gray-900 hover:text-primary-dark transition-colors line-clamp-1"
                  >
                    {review.product_name}
                  </Link>
                  <div className="flex items-center gap-3 mt-1.5">
                    <StarRating rating={review.rating} size="sm" readonly />
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{review.text}</p>
                  {review.image_urls?.length > 0 && (
                    <p className="mt-1.5 text-xs text-gray-400">
                      {review.image_urls.length} photo{review.image_urls.length > 1 ? 's' : ''} attached
                    </p>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[review.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_LABEL[review.status] ?? review.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify**

Navigate to `/profile/reviews` — should show reviews list or empty state. Filter tabs should work.

**Step 3: Commit**

```bash
git add src/app/\(marketplace\)/profile/reviews/page.tsx
git commit -m "feat: add My Reviews page for customer portal"
```

---

## Task 3: Add "My Reviews" Card to Profile Page

**Files:**
- Modify: `src/app/(marketplace)/profile/page.tsx:129-145` (after the Leez Rewards card)

**Step 1: Add the card**

After the closing `</div>` of the Leez Rewards section (around line 145), add:

```tsx
{/* My Reviews Section */}
<div className="mt-6 bg-gradient-to-r from-primary-light to-pink-50 rounded-2xl p-6 border border-primary/20">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-lg font-bold text-gray-900">My Reviews</h2>
      <p className="text-gray-600 text-sm mt-1">
        See your submitted reviews and their status
      </p>
    </div>
    <Link
      href="/profile/reviews"
      className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all hover:scale-105"
    >
      View Reviews
    </Link>
  </div>
</div>
```

**Step 2: Verify**

Visit `/profile` — the "My Reviews" card should appear below "Leez Rewards" with the same gradient style.

**Step 3: Commit**

```bash
git add src/app/\(marketplace\)/profile/page.tsx
git commit -m "feat: add My Reviews link card to profile page"
```

---

## Task 4: Clean Up Dead Code in ReviewForm

**Files:**
- Modify: `src/components/reviews/ReviewForm.tsx:173-191`

The `eligibility?.status` checks for `"pending"`, `"approved"`, and `"blocked"` are unreachable. The `/api/reviews/eligible` endpoint already filters those products out, so `eligibility` is only ever set for genuinely eligible products. Remove those three guard blocks.

**Step 1: Remove the dead branches**

Find and delete lines 173–191 in `ReviewForm.tsx`:

```tsx
// DELETE THIS ENTIRE BLOCK (lines 173-191):
  if (eligibility?.status === "pending") {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-gray-600">Your review is under review</p>
      </div>
    );
  }

  if (eligibility?.status === "approved") {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-gray-600">You&apos;ve already reviewed this product</p>
      </div>
    );
  }

  if (eligibility?.status === "blocked") {
    return null;
  }
```

Also simplify the `EligibleProduct` type (line 10) — remove the `status` field since the eligible endpoint doesn't return it:

```tsx
// BEFORE:
interface EligibleProduct {
  product_id: string;
  order_id: string;
  status: "eligible" | "pending" | "approved" | "blocked";
}

// AFTER:
interface EligibleProduct {
  product_id: string;
  order_id: string;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/reviews/ReviewForm.tsx
git commit -m "refactor: remove unreachable status guards in ReviewForm"
```

---

## Final Verification

1. Visit `/profile/orders` → click an order → should open detail page (not 404)
2. On a completed order → "Write a Review →" links are visible per item
3. Visit `/profile` → "My Reviews" card is visible
4. Visit `/profile/reviews` → shows reviews or empty state with filter tabs
5. `npx tsc --noEmit` → clean

---
