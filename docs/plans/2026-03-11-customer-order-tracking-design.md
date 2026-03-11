# Customer Order Tracking — Design

**Date:** 2026-03-11
**Status:** Approved

## Overview

Customers currently have no visibility into their orders after checkout. This feature adds a dedicated order history and detail view accessible from the customer profile.

## API

### `GET /api/orders/customer`

- Requires authentication (Supabase session); no employee role needed
- Filters `orders` by `user_id` of the authenticated user
- Joins `order_items` → `products` to fetch name and first image
- Returns orders sorted by `created_at` descending
- Response shape per order:
  - `id`, `order_number`, `date`, `status`, `payment_method`, `total_amount`
  - `items[]` — `product_name`, `product_image`, `size`, `color`, `quantity`, `unit_price`
- No seller, commission, or employee data exposed

## Pages

### `/profile/orders` — Order List

- Requires auth; redirects to `/signin` if unauthenticated
- Fetches from `GET /api/orders/customer`
- Renders a list of order cards sorted most-recent first
- Each card shows: order number, date, item count, total amount, status badge
- Status badge colours: pending=yellow, processing=blue, completed=green, cancelled=gray, refunded=gray
- Empty state message when no orders exist
- Tapping a card navigates to `/profile/orders/[id]`

### `/profile/orders/[id]` — Order Detail

- Requires auth; redirects to `/signin` if unauthenticated
- Fetches the specific order from `GET /api/orders/customer` (filtered by id client-side, or pass id as query param)
- **Status timeline** (horizontal stepper): `Pending → Processing → Completed`
  - Cancelled and refunded render as a terminal badge below the header instead of the stepper
- Line items: product thumbnail, name, size/color pill, qty × unit price
- Order summary: subtotal = total (discount already applied at creation)
- Payment method badge
- "Back to My Orders" link

## Profile Page Update

Add a "My Orders" button to `/profile/page.tsx` alongside the existing "View Rewards" link, pointing to `/profile/orders`.

## Out of Scope

- Real-time status push notifications
- Order cancellation by customer
- Return/refund initiation
