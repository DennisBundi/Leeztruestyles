# Seller Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give sellers a trimmed-down dashboard at `/dashboard` showing their own sales, orders, and commission instead of redirecting them to products.

**Architecture:** Render a `SellerDashboard` client component inside the existing `dashboard/page.tsx` when the role is `seller`. The component calls the already-built `/api/dashboard/user-stats` endpoint for stats and `/api/orders` for recent orders. Admin/manager view is unchanged.

**Tech Stack:** Next.js App Router, React (client component), Tailwind, existing glass-card design system.

---

### Task 1: Allow sellers to access the `dashboard` section

**Files:**
- Modify: `src/lib/auth/roles.ts:64-65`

**Step 1: Add `'dashboard'` to seller's allowed sections**

In `canAccessSection`, change the seller array from:
```ts
return ['orders', 'products', 'pos', 'profile', 'settings'].includes(section);
```
to:
```ts
return ['dashboard', 'orders', 'products', 'pos', 'profile', 'settings'].includes(section);
```

**Step 2: Verify the change looks correct**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add src/lib/auth/roles.ts
git commit -m "feat(roles): allow sellers to access dashboard section"
```

---

### Task 2: Create SellerDashboard component

**Files:**
- Create: `src/components/dashboard/SellerDashboard.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatOrderId } from '@/lib/utils/orderId';

interface SellerStats {
  totalSalesToday: number;
  totalOrdersToday: number;
  completedOrdersToday: number;
  pendingOrdersToday: number;
  totalCommission: number;
  lastCommissionPaymentDate: string | null;
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchRecentOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/user-stats');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch stats');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) {
        setRecentOrders((data.orders || []).slice(0, 5));
      }
    } catch {
      setRecentOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fmt = (n: number) => `KES ${n.toLocaleString()}`;

  return (
    <div className="space-y-6 animate-fade-in pt-16 lg:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Dashboard</h1>
        <p className="text-white/50 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card border-l-4 border-[#f9a8d4] p-4">
          <p className="text-white/80 text-sm">{error}</p>
          <button onClick={() => { setError(null); fetchStats(); }} className="text-[#f9a8d4] text-sm font-medium underline mt-1">
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Sales */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Today's Sales</h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : fmt(stats?.totalSalesToday ?? 0)}
          </p>
          <p className="text-white/40 text-xs mt-1">Your sales today</p>
        </div>

        {/* Today's Orders */}
        <Link href="/dashboard/orders" className="glass-card p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Today's Orders</h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : stats?.totalOrdersToday ?? 0}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {loading ? '...' : `${stats?.completedOrdersToday ?? 0} completed · ${stats?.pendingOrdersToday ?? 0} pending`}
          </p>
        </Link>

        {/* Pending Commission */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Pending Commission</h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : fmt(stats?.totalCommission ?? 0)}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {stats?.lastCommissionPaymentDate
              ? `Since ${new Date(stats.lastCommissionPaymentDate).toLocaleDateString()}`
              : 'All time (unpaid)'}
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Today's Orders</h2>
          <Link href="/dashboard/orders" className="text-[#f9a8d4] text-xs font-medium flex items-center gap-1 transition-colors">
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Customer</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Commission</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr><td colSpan={6} className="py-6 text-center text-white/30 text-sm">Loading...</td></tr>
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-white/30 text-sm">No orders today</td></tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs text-white/50">
                      {order.order_number ? `#${order.order_number}` : `#${formatOrderId(order.id)}`}
                    </td>
                    <td className="py-3 px-3 text-sm text-white/80 font-medium">
                      {order.customer || 'Guest'}
                    </td>
                    <td className="py-3 px-3 text-sm text-white font-semibold">
                      KES {(order.total_amount || order.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-500/20 text-green-300'
                        : order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-white/10 text-white/50'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-[#f9a8d4] font-semibold">
                      {order.commission ? `KES ${parseFloat(order.commission).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-[#f9a8d4] text-xs font-medium transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/dashboard/SellerDashboard.tsx
git commit -m "feat(dashboard): add SellerDashboard component with sales, orders, and commission stats"
```

---

### Task 3: Wire SellerDashboard into dashboard/page.tsx

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx`

**Step 1: Replace the seller redirect with the SellerDashboard component**

At the top of the file, add the import after the existing imports:
```tsx
import SellerDashboard from '@/components/dashboard/SellerDashboard';
```

Remove the entire `useEffect` block that checks role and redirects (lines 64-83):
```tsx
// DELETE THIS BLOCK:
useEffect(() => {
  let mounted = true;
  const checkRole = async () => {
    try {
      const response = await fetch('/api/auth/role');
      const { role } = await response.json();
      if (mounted && role === 'seller') {
        setIsRedirecting(true);
        router.replace('/dashboard/products');
        return;
      }
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };
  checkRole();
  return () => { mounted = false; };
}, [router]);
```

Also remove the `isRedirecting` state declaration and its guard JSX block, and the second `useEffect` dependency on `isRedirecting`.

Add a role-check state near the top of the component:
```tsx
const [userRole, setUserRole] = useState<string | null>(null);
const [roleLoading, setRoleLoading] = useState(true);
```

Add a single `useEffect` at the top to fetch role and conditionally kick off data fetching:
```tsx
useEffect(() => {
  fetch('/api/auth/role')
    .then(r => r.json())
    .then(({ role }) => {
      setUserRole(role);
      setRoleLoading(false);
      if (role !== 'seller') {
        fetchDashboardData();
        fetchRecentOrders();
      }
    })
    .catch(() => setRoleLoading(false));
}, []);
```

At the very top of the return (before the existing JSX), add:
```tsx
if (roleLoading) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f9a8d4]" />
    </div>
  );
}

if (userRole === 'seller') {
  return <SellerDashboard />;
}
```

**Step 2: Remove the now-unused `useRouter` import if it's only used for the redirect**

Check if `router` is used anywhere else in the file. If not, remove:
```tsx
import { useRouter } from 'next/navigation';
// and
const router = useRouter();
```

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/app/(admin)/dashboard/page.tsx
git commit -m "feat(dashboard): render SellerDashboard for sellers instead of redirecting to products"
```

---

### Task 4: Manual verification

1. Sign in as a seller account
2. Navigate to `/dashboard`
3. Confirm you see "My Dashboard" with three stat cards: Today's Sales, Today's Orders, Pending Commission
4. Confirm the recent orders table shows today's orders only
5. Sign in as admin — confirm the full admin dashboard still loads unchanged
