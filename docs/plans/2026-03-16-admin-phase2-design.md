# Admin Dashboard Redesign — Phase 2: All Admin Pages

**Date:** 2026-03-16
**Scope:** Phase 2 — All remaining admin pages (orders, products, employees, inventory, payments, loyalty, reviews, importation, profile, settings, orders/[id], POS)
**Goal:** Apply the same glassmorphism treatment from Phase 1 consistently across every admin page

---

## Background

Phase 1 established the glass design system (gradient background, glass utilities, restyled sidebar and dashboard). Phase 2 applies those utilities to the remaining 11 pages using a systematic token-swap approach — no new abstractions, no refactoring, just consistent substitution.

---

## Substitution Map

| Old | New |
|---|---|
| `bg-white` (cards/panels) | `glass-card` |
| `bg-white` (table containers) | `glass-card overflow-hidden` |
| `bg-gray-50` (page bg, `min-h-screen`) | remove — layout gradient shows through |
| `bg-gray-50` (table `thead`) | `bg-black/20` |
| `shadow-md` / `shadow-lg` / `shadow` | remove (glass handles depth) |
| `border-gray-100` / `border-gray-200` | `border-white/10` |
| `text-gray-900` (headings, values) | `text-white` |
| `text-gray-700` / `text-gray-600` | `text-white/70` |
| `text-gray-500` / `text-gray-400` | `text-white/50` |
| Form inputs: `border-gray-200 bg-white` | `bg-white/10 border-white/20 text-white placeholder:text-white/30` |
| Focus ring: `focus:border-primary focus:ring-primary/20` | `focus:border-rose-400/50 focus:ring-rose-400/20 focus:bg-white/15` |
| `bg-gray-100 hover:bg-gray-200 text-gray-700` (secondary buttons) | `bg-white/10 hover:bg-white/20 text-white/70 hover:text-white` |
| `divide-gray-200` / row dividers | `divide-white/10` |
| Table `tr` hover: `hover:bg-gray-50` | `hover:bg-white/5` |
| Status badge: `bg-gray-100 text-gray-600` | `bg-white/10 text-white/60` |

---

## Special Cases

### `orders/[id]` (Order Detail)
- Has its own `min-h-screen bg-gray-50` wrapper — remove it entirely, the admin layout gradient shows through.
- Page header back-link: `text-gray-500 hover:text-gray-700` → `text-white/50 hover:text-white`

### POS (`/pos/page.tsx`)
- Sticky top header bar: `bg-white shadow-sm border-b border-gray-200` → `glass border-b border-white/10`
- Products grid panel and cart panel: `bg-white` → `glass-card`
- Page background: `bg-gray-50` → remove

### Modals (products, employees, inventory add/edit dialogs)
- Modal backdrop: keep `bg-black/50`
- Modal panel: `bg-white rounded-2xl shadow-xl` → `glass-strong` (backdrop-blur-xl bg-white/18 border border-white/30)
- Modal form inputs: follow same input substitution map above

---

## What Does NOT Change

- All logic, state management, data fetching
- Primary action buttons (`bg-primary`, `bg-green-600`, etc.) — kept as-is
- Status badge color meanings: green=completed, yellow=pending, red=cancelled/failed
  - Shift to opacity variants: `bg-green-500/20 text-green-300`, `bg-yellow-500/20 text-yellow-300`, `bg-red-500/20 text-red-300`
- Existing `text-primary` / `[#f9a8d4]` accent colors — unchanged

---

## Files to Modify

1. `src/app/(admin)/dashboard/orders/page.tsx`
2. `src/app/(admin)/dashboard/orders/[id]/page.tsx`
3. `src/app/(admin)/dashboard/products/page.tsx`
4. `src/app/(admin)/dashboard/employees/page.tsx`
5. `src/app/(admin)/dashboard/inventory/page.tsx`
6. `src/app/(admin)/dashboard/payments/page.tsx`
7. `src/app/(admin)/dashboard/loyalty/page.tsx`
8. `src/app/(admin)/dashboard/reviews/page.tsx`
9. `src/app/(admin)/dashboard/importation/page.tsx`
10. `src/app/(admin)/dashboard/profile/page.tsx`
11. `src/app/(admin)/dashboard/settings/page.tsx`
12. `src/app/(admin)/pos/page.tsx`
