# Admin Phase 2 — Glass Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the glassmorphism design system from Phase 1 to all remaining admin pages.

**Architecture:** Systematic token-swap per file. No logic changes. Each file gets a targeted set of className substitutions following the Phase 2 design spec in `docs/plans/2026-03-16-admin-phase2-design.md`.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, custom glass utilities (already defined in `tailwind.config.ts`)

---

## Master Substitution Reference

Apply these rules in every task. When in doubt, refer back here.

| Old | New |
|---|---|
| `bg-white` on cards/panels | `glass-card` |
| `bg-white` on table containers | `glass-card overflow-hidden` |
| `bg-gray-50` on page wrappers (`min-h-screen`) | remove |
| `bg-gray-50` on `thead` | `bg-black/20` |
| `shadow-md`, `shadow-lg`, `shadow-sm`, `shadow` | remove entirely |
| `border-gray-100`, `border-gray-200` | `border-white/10` |
| `text-gray-900` (headings, values) | `text-white` |
| `text-gray-700`, `text-gray-600` | `text-white/70` |
| `text-gray-500`, `text-gray-400` | `text-white/50` |
| Form inputs: `border-gray-200 bg-white` | `bg-white/10 border-white/20 text-white placeholder:text-white/30` |
| `focus:border-primary focus:ring-2 focus:ring-primary/20` | `focus:border-rose-400/50 focus:ring-rose-400/20 focus:bg-white/15` |
| `focus:ring-indigo-500` | `focus:ring-rose-400/50` |
| `bg-gray-100 hover:bg-gray-200 text-gray-700` (secondary buttons) | `bg-white/10 hover:bg-white/20 text-white/70 hover:text-white` |
| `divide-gray-100`, `divide-gray-200` | `divide-white/10` |
| `hover:bg-gray-50` on table rows | `hover:bg-white/5` |
| Status badge `bg-green-100 text-green-700` | `bg-green-500/20 text-green-300` |
| Status badge `bg-yellow-100 text-yellow-700` | `bg-yellow-500/20 text-yellow-300` |
| Status badge `bg-red-100 text-red-700` | `bg-red-500/20 text-red-300` |
| Status badge `bg-blue-100 text-blue-700` | `bg-blue-500/20 text-blue-300` |
| Status badge `bg-gray-100 text-gray-600` | `bg-white/10 text-white/60` |
| Modal panel: `bg-white rounded-2xl shadow-2xl` | `glass-strong` |
| Modal info box: `bg-gray-50 rounded-lg` | `bg-black/20 rounded-lg` |
| Modal cancel button: `border-2 border-gray-200 text-gray-700 hover:bg-gray-50` | `border border-white/20 text-white/70 hover:bg-white/10` |
| `bg-red-50 border border-red-200` (bulk action bar) | `bg-red-500/10 border border-red-400/20` |
| `text-red-800` in bulk bar | `text-red-300` |
| `text-gray-600 hover:text-gray-900` (clear selection link) | `text-white/50 hover:text-white` |
| Loading text: `text-gray-600` | `text-white/60` |
| Empty state: `text-gray-500`, `text-gray-300` icons | `text-white/50`, `text-white/20` |
| `bg-gray-100` image placeholder | `bg-white/10` |
| `bg-gray-100 text-gray-600` variant pills | `bg-white/10 text-white/60` |

---

## Task 1: Orders Page

**File:** `src/app/(admin)/dashboard/orders/page.tsx`

**Step 1: Restyle page header**

Find:
```tsx
<h1 className="text-2xl font-bold text-gray-900 mb-1">Orders</h1>
<p className="text-sm text-gray-500">
```

Replace with:
```tsx
<h1 className="text-2xl font-bold text-white mb-1">Orders</h1>
<p className="text-sm text-white/50">
```

**Step 2: Restyle stat cards (4 instances)**

Find (all 4 instances):
```
bg-white rounded-xl shadow-md border border-gray-100 p-5
```
Replace all with:
```
glass-card p-5
```

Find (4 instances in stat cards):
```
text-xs text-gray-600 mb-2
```
Replace all with:
```
text-xs text-white/60 mb-2
```

Find (loading skeleton in stats):
```
text-2xl font-bold text-gray-400
```
Replace with:
```
text-2xl font-bold text-white/30
```

Find (total orders value):
```
text-2xl font-bold text-gray-900
```
Replace with:
```
text-2xl font-bold text-white
```

Find (sub-label in stats, 3 occurrences):
```
text-xs text-gray-500 mt-1
```
Replace all with:
```
text-xs text-white/50 mt-1
```

Find (completed count):
```
text-2xl font-bold text-green-600
```
Replace:
```
text-2xl font-bold text-green-300
```

Find (pending count):
```
text-2xl font-bold text-yellow-600
```
Replace:
```
text-2xl font-bold text-yellow-300
```

**Step 3: Restyle filters panel**

Find:
```
bg-white rounded-xl shadow-md border border-gray-100 p-5
```
(This is the filters panel — but we already replaced all stat cards in step 2. This should be the only remaining one now.)

Remaining occurrence in filters div: same replacement applies — already covered.

Find all filter inputs/selects:
```
border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
```
Replace all with:
```
bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15
```

Find the filter result text:
```
text-xs text-gray-500
```
(at the bottom of filters panel)
Replace with:
```
text-xs text-white/50
```

**Step 4: Restyle bulk action bar**

Find:
```
flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3
```
Replace:
```
flex items-center justify-between bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-3
```

Find:
```
text-sm font-medium text-red-800
```
Replace:
```
text-sm font-medium text-red-300
```

Find:
```
text-sm text-gray-600 hover:text-gray-900 transition-colors
```
Replace:
```
text-sm text-white/50 hover:text-white transition-colors
```

**Step 5: Restyle orders table**

Find:
```
bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden
```
Replace:
```
glass-card overflow-hidden
```

Find:
```
thead className="bg-gray-50 border-b border-gray-200"
```
Replace:
```
thead className="bg-black/20 border-b border-white/10"
```

Find (all `th` text):
```
text-xs font-medium text-gray-600
```
Replace all with:
```
text-xs font-medium text-white/50
```

Find:
```
tbody className="divide-y divide-gray-100"
```
Replace:
```
tbody className="divide-y divide-white/10"
```

Find (loading text in table):
```
text-xs text-gray-600
```
(inside the `flex items-center` spinner row)
Replace:
```
text-xs text-white/60
```

Find (empty state):
```
text-gray-500
```
(in `<div className="text-gray-500">` wrapping the empty icon+text)
Replace:
```
text-white/50
```

Find (empty state icon):
```
text-gray-300
```
(SVG icon in empty state)
Replace:
```
text-white/20
```

Find (empty state messages `text-sm font-medium` and `text-xs mt-1`):
```
<p className="text-sm font-medium">No orders found</p>
<p className="text-xs mt-1">
```
Replace:
```
<p className="text-sm font-medium text-white/60">No orders found</p>
<p className="text-xs mt-1 text-white/40">
```

Find (row hover + selected):
```
hover:bg-gray-50 transition-colors
```
Replace:
```
hover:bg-white/5 transition-colors
```

Find (selected row highlight):
```
bg-red-50
```
Replace:
```
bg-red-500/10
```

Find (order ID in row):
```
font-mono text-xs font-semibold text-gray-900
```
Replace:
```
font-mono text-xs font-semibold text-white
```

Find (order ID sub-line):
```
text-xs text-gray-400 mt-0.5
```
Replace:
```
text-xs text-white/30 mt-0.5
```

Find (customer name in row):
```
text-sm font-medium text-gray-900
```
Replace:
```
text-sm font-medium text-white
```

Find (customer email in row):
```
text-xs text-gray-500
```
(in the customer cell)
Replace:
```
text-xs text-white/50
```

Find (seller cell):
```
text-xs text-gray-600
```
Replace:
```
text-xs text-white/60
```

Find (type badge):
```
px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 uppercase
```
Replace:
```
px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 uppercase
```

Find (commission sub-label):
```
text-xs text-gray-500 mt-0.5
```
Replace:
```
text-xs text-white/50 mt-0.5
```

Find (amount in non-seller row):
```
font-semibold text-gray-900
```
(the KES amount span)
Replace:
```
font-semibold text-white
```

Find (N/A commission):
```
text-gray-400
```
(inside `Commission: <span ...>`)
Replace:
```
text-white/30
```

Find (payment method cell):
```
text-xs text-gray-600 capitalize
```
Replace:
```
text-xs text-white/60 capitalize
```

Find (status badges):
```
bg-green-100 text-green-700
```
Replace:
```
bg-green-500/20 text-green-300
```

Find:
```
bg-yellow-100 text-yellow-700
```
Replace:
```
bg-yellow-500/20 text-yellow-300
```

Find:
```
bg-blue-100 text-blue-700
```
(in status column fallback)
Replace:
```
bg-blue-500/20 text-blue-300
```

Find (date cell):
```
text-xs text-gray-600
```
(in date `<td>`)
Replace:
```
text-xs text-white/60
```

**Step 6: Restyle delete confirmation modal**

Find:
```
bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300
```
Replace:
```
glass-strong max-w-md w-full p-6 animate-in zoom-in-95 duration-300
```

Find:
```
w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0
```
Replace:
```
w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0
```

Find:
```
text-lg font-bold text-gray-900
```
(modal title)
Replace:
```
text-lg font-bold text-white
```

Find:
```
text-sm text-gray-600 mt-1
```
(modal subtitle)
Replace:
```
text-sm text-white/60 mt-1
```

Find:
```
bg-gray-50 rounded-lg p-4 mb-6
```
Replace:
```
bg-black/20 rounded-lg p-4 mb-6
```

Find (modal info labels):
```
text-gray-600
```
(the "Order ID:", "Customer:", etc. spans — there are 4)
Replace all with:
```
text-white/60
```

Find (modal info values):
```
font-semibold text-gray-900
```
(there are 4)
Replace all with:
```
font-semibold text-white
```

Find:
```
text-sm text-gray-700 mb-6
```
(the confirmation paragraph)
Replace:
```
text-sm text-white/70 mb-6
```

Find (modal cancel button):
```
flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
```
Replace:
```
flex-1 px-4 py-3 border border-white/20 text-white/70 rounded-xl font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
```

**Step 7: Restyle bulk delete modal**

Find:
```
bg-white rounded-2xl shadow-2xl max-w-md w-full p-6
```
(bulk delete modal — no animation classes)
Replace:
```
glass-strong max-w-md w-full p-6
```

Find:
```
flex items-center justify-center w-12 h-12 rounded-full bg-red-100 flex-shrink-0
```
Replace:
```
flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 flex-shrink-0
```

Find (bulk modal title):
```
text-lg font-bold text-gray-900
```
Replace:
```
text-lg font-bold text-white
```

Find (bulk modal subtitle):
```
text-sm text-gray-500
```
Replace:
```
text-sm text-white/50
```

Find (bulk modal body text):
```
text-sm text-gray-700 mb-6
```
Replace:
```
text-sm text-white/70 mb-6
```

Find (bulk cancel button):
```
flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50
```
Replace:
```
flex-1 px-4 py-2.5 border border-white/20 text-white/70 rounded-xl font-semibold hover:bg-white/10 transition-colors disabled:opacity-50
```

**Step 8: Commit**

```bash
git add src/app/\(admin\)/dashboard/orders/page.tsx
git commit -m "feat(admin): apply glass styling to orders page"
```

---

## Task 2: Order Detail Page

**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx`

**Step 1: Fix STATUS_COLORS map**

Find:
```tsx
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
```

Replace with:
```tsx
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  processing: 'bg-blue-500/20 text-blue-300',
  completed: 'bg-green-500/20 text-green-300',
  cancelled: 'bg-white/10 text-white/60',
  refunded: 'bg-red-500/20 text-red-300',
  paid: 'bg-emerald-500/20 text-emerald-300',
  shipped: 'bg-indigo-500/20 text-indigo-300',
  delivered: 'bg-green-500/20 text-green-300',
}
```

**Step 2: Fix error state**

Find:
```tsx
<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-3xl mx-auto">
    <div className="mb-6">
      <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-gray-700">
```

Replace with:
```tsx
<div className="py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-3xl mx-auto">
    <div className="mb-6">
      <Link href="/dashboard/orders" className="text-sm text-white/50 hover:text-white">
```

**Step 3: Fix main page wrapper**

Find:
```tsx
<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
```
(the main return wrapper)
Replace:
```tsx
<div className="py-12 px-4 sm:px-6 lg:px-8 pt-16 lg:pt-12">
```

**Step 4: Fix header back link and title**

Find:
```tsx
<Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-gray-700">
  ← Orders
</Link>
<h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
```

Replace:
```tsx
<Link href="/dashboard/orders" className="text-sm text-white/50 hover:text-white">
  ← Orders
</Link>
<h1 className="text-2xl font-bold text-white">{order.order_number}</h1>
```

**Step 5: Restyle all cards (5 cards)**

Find all 5 instances of:
```
bg-white rounded-2xl shadow p-6
```
Replace all with:
```
glass-card p-6
```

**Step 6: Restyle card headings**

Find (card section headings — `text-sm font-semibold text-gray-700`):
```
text-sm font-semibold text-gray-700
```
Replace all (3 instances in cards + the items header):
```
text-sm font-semibold text-white/70
```

Find:
```
text-base font-semibold text-gray-900 mb-4
```
(Items card heading)
Replace:
```
text-base font-semibold text-white mb-4
```

**Step 7: Restyle order details grid**

Find (label text in the 2-col grid):
```
text-gray-500
```
(the `<p className="text-gray-500">` labels: Date, Payment Method, Type, Seller)
Replace all with:
```
text-white/50
```

Find (value text in the 2-col grid):
```
font-medium text-gray-900
```
Replace all with:
```
font-medium text-white
```

**Step 8: Restyle status update buttons**

Find (inactive status button):
```
bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100
```
Replace:
```
bg-white/5 text-white/60 border-white/20 hover:bg-white/10
```

**Step 9: Restyle items list**

Find:
```
divide-y divide-gray-100
```
Replace:
```
divide-y divide-white/10
```

Find (thumbnail placeholder):
```
w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0
```
Replace:
```
w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0
```

Find (placeholder icon):
```
text-gray-400
```
(the SVG in the placeholder div)
Replace:
```
text-white/30
```

Find (item product name):
```
font-medium text-gray-900 truncate
```
Replace:
```
font-medium text-white truncate
```

Find (size/color variant pills):
```
text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full
```
Replace (2 instances):
```
text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full
```

Find (qty text):
```
text-sm text-gray-500 mt-1
```
Replace:
```
text-sm text-white/50 mt-1
```

Find (line total):
```
font-semibold text-gray-900 flex-shrink-0
```
Replace:
```
font-semibold text-white flex-shrink-0
```

**Step 10: Restyle total card**

Find:
```
text-base font-semibold text-gray-900
```
(Order Total label)
Replace:
```
text-base font-semibold text-white/70
```

Find:
```
text-xl font-bold text-gray-900
```
(total amount)
Replace:
```
text-xl font-bold text-white
```

**Step 11: Commit**

```bash
git add "src/app/(admin)/dashboard/orders/[id]/page.tsx"
git commit -m "feat(admin): apply glass styling to order detail page"
```

---

## Task 3: Products Page

**File:** `src/app/(admin)/dashboard/products/page.tsx`

This is a large file. Apply the master substitution map systematically. Key specific changes:

**Step 1: Page header**

Find:
```tsx
<h1 className="text-4xl font-bold text-gray-900 mb-2">Products</h1>
<p className="text-gray-600">Manage your product catalog</p>
```

Replace:
```tsx
<h1 className="text-4xl font-bold text-white mb-2">Products</h1>
<p className="text-white/60">Manage your product catalog</p>
```

**Step 2: Secondary button (Import/Export style)**

Find:
```
px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center gap-2
```
Replace:
```
px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl font-medium transition-colors flex items-center gap-2
```

**Step 3: Filter panel**

Find:
```
bg-white rounded-2xl shadow-lg border border-gray-100 p-6
```
(filter panel)
Replace:
```
glass-card p-6
```

Find all filter inputs/selects (same pattern as orders):
```
border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
```
Replace all with:
```
bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15
```

Find (filter result text):
```
text-sm text-gray-600
```
(below filters)
Replace:
```
text-sm text-white/60
```

**Step 4: Products table**

Find:
```
bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hidden md:block
```
Replace:
```
glass-card overflow-hidden hidden md:block
```

Find:
```
thead className="bg-gray-50 border-b border-gray-200"
```
Replace:
```
thead className="bg-black/20 border-b border-white/10"
```

Find all `th` text:
```
text-left text-sm font-semibold text-gray-700
```
Replace all:
```
text-left text-sm font-semibold text-white/60
```

Find:
```
text-center text-sm font-semibold text-gray-700
```
Replace all:
```
text-center text-sm font-semibold text-white/60
```

Find (row hover):
```
hover:bg-gray-50
```
Replace all:
```
hover:bg-white/5
```

Find (product name in rows):
```
font-medium text-gray-900
```
Replace all:
```
font-medium text-white
```

Find (category/meta text in rows):
```
text-sm text-gray-600
```
Replace all:
```
text-sm text-white/60
```

Find (secondary row text):
```
text-xs text-gray-500
```
Replace all:
```
text-xs text-white/50
```

**Step 5: Mobile cards**

Apply same pattern to the mobile card layout (if any `bg-white` cards exist for mobile product display):

Find:
```
bg-white rounded-xl
```
Replace:
```
glass-card
```

**Step 6: Modals (Add/Edit product)**

Find:
```
bg-white rounded-2xl shadow-xl
```
(or similar modal panel class)
Replace:
```
glass-strong
```

Find (modal header/title):
```
text-gray-900
```
Replace:
```
text-white
```

Find (modal close/cancel button):
```
border-gray-200 text-gray-700 hover:bg-gray-50
```
Replace:
```
border-white/20 text-white/70 hover:bg-white/10
```

**Step 7: Commit**

```bash
git add src/app/\(admin\)/dashboard/products/page.tsx
git commit -m "feat(admin): apply glass styling to products page"
```

---

## Task 4: Employees Page

**File:** `src/app/(admin)/dashboard/employees/page.tsx`

**Step 1: Page header**

Find:
```tsx
<h1 className="text-4xl font-bold text-gray-900 mb-2">Employees</h1>
<p className="text-gray-600">Manage staff and track sales performance</p>
```
Replace:
```tsx
<h1 className="text-4xl font-bold text-white mb-2">Employees</h1>
<p className="text-white/60">Manage staff and track sales performance</p>
```

**Step 2: Loading state text**

Find:
```tsx
<p className="text-gray-600">Loading employees...</p>
```
Replace:
```tsx
<p className="text-white/60">Loading employees...</p>
```

**Step 3: Stat cards (3 cards)**

Find all 3:
```
bg-white rounded-xl shadow-lg border border-gray-100 p-6
```
Replace all:
```
glass-card p-6
```

Find (stat card labels):
```
text-sm text-gray-600 mb-2
```
Replace all:
```
text-sm text-white/60 mb-2
```

Find (stat card values `text-gray-900`):
```
text-3xl font-bold text-gray-900
```
Replace all:
```
text-3xl font-bold text-white
```

Find (filtered count sub-label):
```
text-xs text-gray-500 mt-1
```
Replace:
```
text-xs text-white/50 mt-1
```

**Step 4: Filter panel**

Find:
```
bg-white rounded-2xl shadow-lg border border-gray-100 p-6
```
(filter panel)
Replace:
```
glass-card p-6
```

Find filter inputs:
```
border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
```
Replace all:
```
bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15
```

Find (filter result count):
```
text-sm text-gray-600
```
Replace:
```
text-sm text-white/60
```

**Step 5: Employees table**

Find:
```
bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden
```
Replace:
```
glass-card overflow-hidden
```

Find:
```
thead className="bg-gray-50 border-b border-gray-200"
```
Replace:
```
thead className="bg-black/20 border-b border-white/10"
```

Find all `th` labels:
```
text-left text-sm font-semibold text-gray-700
```
Replace all:
```
text-left text-sm font-semibold text-white/60
```

Find (row divider):
```
divide-y divide-gray-100
```
Replace:
```
divide-y divide-white/10
```

Find (row hover):
```
hover:bg-gray-50
```
Replace:
```
hover:bg-white/5
```

Find (employee name in row):
```
font-semibold text-gray-900
```
Replace all:
```
font-semibold text-white
```

Find (secondary data in rows like code, email, role):
```
text-sm text-gray-600
```
Replace all:
```
text-sm text-white/60
```

Find (tertiary data):
```
text-xs text-gray-500
```
Replace all:
```
text-xs text-white/50
```

**Step 6: Modals (Add Employee, Edit, Mark All Paid)**

Apply modal pattern:
- `bg-white rounded-2xl shadow-2xl` → `glass-strong`
- Info boxes: `bg-gray-50 rounded-lg` → `bg-black/20 rounded-lg`
- Text: apply substitution map
- Cancel buttons: `border-2 border-gray-200 text-gray-700 hover:bg-gray-50` → `border border-white/20 text-white/70 hover:bg-white/10`

**Step 7: Commit**

```bash
git add src/app/\(admin\)/dashboard/employees/page.tsx
git commit -m "feat(admin): apply glass styling to employees page"
```

---

## Task 5: Inventory Page

**File:** `src/app/(admin)/dashboard/inventory/page.tsx`

Apply master substitution map. Key patterns (same as orders/employees):
- Page `h1`: `text-gray-900` → `text-white`
- Stat cards: `bg-white rounded-xl shadow-... border border-gray-100` → `glass-card`
- Filter panel: same
- Table: `bg-white... overflow-hidden` → `glass-card overflow-hidden`
- `thead bg-gray-50 border-b border-gray-200` → `bg-black/20 border-b border-white/10`
- All `text-gray-*` → matching `text-white/*` from master map
- Row hover: `hover:bg-gray-50` → `hover:bg-white/5`
- Modals (add/edit stock): `bg-white rounded-2xl shadow-xl` → `glass-strong`

**Step 1: Apply all substitutions per master map**

Read the file carefully and apply each substitution. The page follows the same structure as orders and employees.

**Step 2: Commit**

```bash
git add src/app/\(admin\)/dashboard/inventory/page.tsx
git commit -m "feat(admin): apply glass styling to inventory page"
```

---

## Task 6: Payments Page

**File:** `src/app/(admin)/dashboard/payments/page.tsx`

**Step 1: Page header**

Find:
```tsx
<h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Transactions</h1>
<p className="text-gray-600">Track and reconcile all payment transactions</p>
```
Replace:
```tsx
<h1 className="text-4xl font-bold text-white mb-2">Payment Transactions</h1>
<p className="text-white/60">Track and reconcile all payment transactions</p>
```

**Step 2: Stat cards**

Find all 4:
```
bg-white rounded-xl shadow-lg border border-gray-100 p-6
```
Replace all:
```
glass-card p-6
```

Apply substitution map to stat card labels and values.

**Step 3: Filter panel + table**

Apply the full master substitution map. Same structure as orders.

**Step 4: Transaction status badges**

Find:
```
bg-green-100 text-green-700
```
Replace: `bg-green-500/20 text-green-300`

Find:
```
bg-yellow-100 text-yellow-700
```
Replace: `bg-yellow-500/20 text-yellow-300`

Find:
```
bg-red-100 text-red-700
```
Replace: `bg-red-500/20 text-red-300`

**Step 5: Commit**

```bash
git add src/app/\(admin\)/dashboard/payments/page.tsx
git commit -m "feat(admin): apply glass styling to payments page"
```

---

## Task 7: Loyalty Page

**File:** `src/app/(admin)/dashboard/loyalty/page.tsx`

This page shows analytics stats and tier breakdown. Apply master substitution map.

**Step 1: Page header + stat cards**

Find and replace:
- `text-gray-900` → `text-white`
- `text-gray-600` / `text-gray-500` → `text-white/60` / `text-white/50`
- `bg-white rounded-*` cards → `glass-card`
- `shadow-*` → remove

**Step 2: Tier breakdown and chart panels**

Apply same glass-card treatment to any panels.

**Step 3: Top referrers list**

Apply substitution map to table/list items.

**Step 4: Commit**

```bash
git add src/app/\(admin\)/dashboard/loyalty/page.tsx
git commit -m "feat(admin): apply glass styling to loyalty page"
```

---

## Task 8: Reviews Page + ReviewModeration Component

**Files:**
- `src/app/(admin)/dashboard/reviews/page.tsx`
- `src/components/reviews/ReviewModeration.tsx`

**Step 1: Page wrapper**

In `reviews/page.tsx`, find:
```tsx
<div className="p-6">
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
    <p className="text-gray-600 mt-1">
```
Replace:
```tsx
<div className="p-6 pt-16 lg:pt-6">
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-white">Review Moderation</h1>
    <p className="text-white/60 mt-1">
```

**Step 2: ReviewModeration component stat cards**

In `ReviewModeration.tsx`, find (3 instances):
```
bg-white rounded-lg shadow-sm p-4 text-center
```
Replace all:
```
glass-card p-4 text-center
```

Find stat card labels:
```
text-sm text-gray-500
```
Replace:
```
text-sm text-white/50
```

**Step 3: Tab bar**

Find:
```
flex border-b border-gray-200
```
Replace:
```
flex border-b border-white/10
```

Find (active tab):
```
border-current
```
(active tab — this stays, it's dynamic)

Find (inactive tab):
```
border-transparent text-gray-500 hover:text-gray-700
```
Replace:
```
border-transparent text-white/50 hover:text-white
```

Find (count badges in tabs):
```
px-1.5 py-0.5 text-xs rounded-full bg-gray-100
```
Replace:
```
px-1.5 py-0.5 text-xs rounded-full bg-white/10
```

**Step 4: Review cards (loading skeleton)**

Find (skeleton loading cards):
```
bg-white rounded-lg shadow-sm p-6
```
Replace:
```
glass-card p-6
```

Find (skeleton placeholder divs):
```
bg-gray-200 rounded
```
Replace:
```
bg-white/20 rounded
```

Find (avatar skeleton):
```
w-12 h-12 bg-gray-200 rounded
```
Replace:
```
w-12 h-12 bg-white/20 rounded
```

**Step 5: Real review cards**

The real review card items follow the same pattern. Apply master substitution map to all text and bg classes.

**Step 6: Commit**

```bash
git add src/app/\(admin\)/dashboard/reviews/page.tsx src/components/reviews/ReviewModeration.tsx
git commit -m "feat(admin): apply glass styling to reviews page and component"
```

---

## Task 9: Importation Page + ImportationAdmin Component

**Files:**
- `src/app/(admin)/dashboard/importation/page.tsx`
- `src/components/admin/ImportationAdmin.tsx`

**Step 1: Page wrapper**

In `importation/page.tsx`, find:
```tsx
<div className="p-6">
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Importation Waitlist</h1>
    <p className="text-gray-600 mt-1">
```
Replace:
```tsx
<div className="p-6 pt-16 lg:pt-6">
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-white">Importation Waitlist</h1>
    <p className="text-white/60 mt-1">
```

**Step 2: ImportationAdmin stat cards**

In `ImportationAdmin.tsx`, find:
```
bg-white rounded-xl p-5 shadow-sm border border-gray-100
```
Replace:
```
glass-card p-5
```

Find (stat labels):
```
text-sm text-gray-500 mb-1
```
Replace:
```
text-sm text-white/50 mb-1
```

Find (stat value color `text-gray-900`):
```
"text-gray-900"
```
(in the `color` field of the stats array)
Replace:
```
"text-white"
```

**Step 3: Filter panel**

Find:
```
bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3
```
Replace:
```
glass-card p-4 flex flex-wrap gap-3
```

Find filter selects:
```
border border-gray-300 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500
```
Replace all:
```
bg-white/10 border border-white/20 text-white px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400/50
```

**Step 4: Applications table**

Find:
```
bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden
```
Replace:
```
glass-card overflow-hidden
```

Find:
```
thead className="bg-gray-50 border-b border-gray-100"
```
Replace:
```
thead className="bg-black/20 border-b border-white/10"
```

Find (loading/empty state):
```
text-gray-400
```
Replace:
```
text-white/40
```

Find (row hover):
```
hover:bg-gray-50 transition-colors
```
Replace:
```
hover:bg-white/5 transition-colors
```

Find (table header text):
```
text-left text-xs font-semibold text-gray-500 uppercase tracking-wide
```
Replace all:
```
text-left text-xs font-semibold text-white/50 uppercase tracking-wide
```

Find (primary row text):
```
font-semibold text-gray-900
```
Replace:
```
font-semibold text-white
```

Find (secondary row text):
```
text-gray-500 text-xs
```
Replace:
```
text-white/50 text-xs
```

Find:
```
text-gray-900
```
(other row values)
Replace:
```
text-white
```

**Step 5: Commit**

```bash
git add src/app/\(admin\)/dashboard/importation/page.tsx src/components/admin/ImportationAdmin.tsx
git commit -m "feat(admin): apply glass styling to importation page and component"
```

---

## Task 10: Profile Page

**File:** `src/app/(admin)/dashboard/profile/page.tsx`

**Step 1: Apply master substitution map**

The profile page has a form with inputs and a card layout. Apply:
- Page heading: `text-gray-900` → `text-white`
- Cards: `bg-white rounded-* shadow-* border border-gray-*` → `glass-card`
- Labels: `text-gray-700` / `text-gray-600` → `text-white/70` / `text-white/60`
- Inputs: apply form input substitution
- Messages (success/error): keep colors but shift to `bg-green-500/20 text-green-300` / `bg-red-500/20 text-red-300`

**Step 2: Commit**

```bash
git add src/app/\(admin\)/dashboard/profile/page.tsx
git commit -m "feat(admin): apply glass styling to profile page"
```

---

## Task 11: Settings Page

**File:** `src/app/(admin)/dashboard/settings/page.tsx`

**Step 1: Apply master substitution map**

The settings page shows user stats. Apply:
- All `text-gray-*` → corresponding `text-white/*`
- All `bg-white` cards → `glass-card`
- Stat card labels and values
- Any form inputs

**Step 2: Commit**

```bash
git add src/app/\(admin\)/dashboard/settings/page.tsx
git commit -m "feat(admin): apply glass styling to settings page"
```

---

## Task 12: POS Page

**File:** `src/app/(admin)/pos/page.tsx`

This page has its own layout (not under `dashboard/layout.tsx`). It needs the gradient background added manually.

**Step 1: Add gradient background**

Find the outermost wrapper:
```tsx
<div className="min-h-screen bg-gray-50">
```
Replace:
```tsx
<div className="min-h-screen relative">
  {/* Fixed gradient background */}
  <div className="fixed inset-0 bg-gradient-to-br from-[#3d0020] via-[#220025] to-[#130030] -z-10" />
```

> **Note:** This adds an opening div + the background div. Make sure the closing `</div>` at the end of the component matches.

**Step 2: Restyle sticky header bar**

Find:
```
bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40
```
Replace:
```
glass border-b border-white/10 sticky top-0 z-40
```

Find (POS title):
```
text-2xl font-bold text-gray-900
```
Replace:
```
text-2xl font-bold text-white
```

Find (subtitle):
```
text-xs text-gray-500 mt-0.5
```
Replace:
```
text-xs text-white/50 mt-0.5
```

Find (secondary header button):
```
flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs
```
Replace:
```
flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors font-medium text-xs
```

Find (employee info):
```
text-sm text-gray-600
```
Replace:
```
text-sm text-white/60
```

Find (employee code):
```
font-semibold text-gray-900
```
Replace:
```
font-semibold text-white
```

Find (employee role):
```
text-xs text-gray-500 mt-1 capitalize
```
Replace:
```
text-xs text-white/50 mt-1 capitalize
```

**Step 3: Restyle products panel and cart panel**

Apply master substitution map to:
- Product card backgrounds: `bg-white` → `glass-card`
- Cart panel background: `bg-white` → `glass-card` (or `glass` if it's a sidebar)
- All `text-gray-*` → `text-white/*`
- Product search input: apply form input substitution
- Category filter pills: `bg-gray-100 text-gray-700` → `bg-white/10 text-white/70`; active: keep `bg-primary`

**Step 4: Restyle cart items and summary**

- Cart item text: `text-gray-*` → `text-white/*`
- Dividers: `divide-gray-*` → `divide-white/10`
- Total row: `text-gray-900 font-bold` → `text-white font-bold`
- Remove/quantity buttons: `bg-gray-100 hover:bg-gray-200` → `bg-white/10 hover:bg-white/20`

**Step 5: Restyle modals (payment, receipt)**

Apply modal substitution: `bg-white rounded-2xl shadow-xl` → `glass-strong`

**Step 6: Commit**

```bash
git add src/app/\(admin\)/pos/page.tsx
git commit -m "feat(admin): apply glass styling to POS page"
```

---

## Final Verification

After all tasks complete:

1. Visit each page in the browser at `http://localhost:3008/dashboard/*`
2. Confirm gradient shows through (no white backgrounds)
3. Confirm all text is readable (white/opacity variants on dark glass)
4. Confirm form inputs have light glass style (text visible when typing)
5. Confirm modals use `glass-strong`
6. Confirm tables have dark header rows
7. Check POS at `http://localhost:3008/pos` — gradient background + glass panels
8. Test mobile breakpoints on a few pages
