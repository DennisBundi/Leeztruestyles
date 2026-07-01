# POS Seller Selector — Design Spec

**Date:** 2026-07-01
**Status:** Approved

## Problem

When an admin or manager processes a sale at the POS, the order is recorded under their own employee ID. Since admins earn no commission, sales they log on behalf of a seller go unattributed — the seller gets no commission credit.

## Goal

Add an optional seller selector to the POS checkout so an admin or manager can attribute a sale to the employee who actually made it, ensuring that employee earns their commission.

## Scope

UI-only change. The API already supports `seller_id` on order creation and already calculates commission based on the seller's role (skipping commission when the seller is an admin). No backend changes required.

## Approach: State in POSInterface, UI in POSCart

`POSInterface` fetches and owns the employee list and selected seller state. It passes the list and selection down to `POSCart` as props. `POSCart` renders the dropdown and uses the override ID at submit time.

## Data Flow

### POSInterface

- Fetch `/api/employees` on mount when `userRole === 'admin' || userRole === 'manager'`.
- Filter response client-side: exclude employees with `role === 'admin'`.
- Hold two new state variables: `selectedSellerId: string | undefined` and `selectedSellerCode: string | undefined`.
- Pass four new props to `POSCart`:
  - `employees: { id: string; employee_code: string; name: string }[]`
  - `sellerOverrideId: string | undefined`
  - `sellerOverrideCode: string | undefined`
  - `onSellerChange: (id: string | null, code: string | null) => void`
- Reset `selectedSellerId` and `selectedSellerCode` to `undefined` inside `handleOrderComplete` (fires after successful sale).

### POSCart

- Accept the four new props.
- In `handleCompleteSale`, use `sellerOverrideId ?? employeeId` as `seller_id` in both the create and update API calls.
- Render the seller dropdown when `employees.length > 0`.
- On sale completion, the reset is driven by `POSInterface` via `onSellerChange(null)`.

## UI

### Seller dropdown

- Appears in the checkout form between "Sale Date/Time" and the cart items list.
- Only rendered when `employees` prop is non-empty.
- Styled as a `<select>` matching the existing Social Platform dropdown (`bg-white/10 border-2 border-white/20` etc.).
- Label: **Seller (Optional)**
- Default option: `Select seller...` (value `""`) — means admin is submitting for themselves.
- Each option: `{name} — {employee_code}`.

### Success modal / employee info footer

- The existing "Sale by: {code}" line at the bottom of the cart updates to show the selected seller's code when one is chosen, otherwise shows the logged-in admin's own code.

## Edge Cases

| Scenario | Behaviour |
|---|---|
| `/api/employees` fetch fails | `employees` stays `[]`; selector doesn't render; POS works as before |
| No seller selected | `seller_id` = admin's own employee ID; commission skipped (existing logic) |
| Seller selected | `seller_id` = selected employee ID; commission calculated at 3% (existing logic) |
| Manager uses POS | Same selector shown; managers can attribute sales to sellers |
| Sale completes | Selected seller resets to empty (same moment customer name and date reset) |

## Files to Change

| File | Change |
|---|---|
| `src/components/pos/POSInterface.tsx` | Fetch employees, hold seller state, pass props to POSCart, reset on order complete |
| `src/components/pos/POSCart.tsx` | Accept new props, render seller dropdown, use override ID at submit |

No API, database, or migration changes required.
