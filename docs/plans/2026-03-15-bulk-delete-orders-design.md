# Bulk Delete Orders — Design

## Overview

Add multi-select bulk delete to the admin orders table. Admin-only. Any order status. Checkbox per row, select-all in header, floating action bar when selection is active, single confirmation modal for the batch.

## UI Design

**Checkbox column** — New leftmost column added to the table (admin-only, hidden for sellers/managers). Each row has a checkbox. Header row has a master checkbox: unchecked = none selected, indeterminate = some selected, checked = all filtered rows selected.

**Floating action bar** — Appears above the table only when ≥1 order is selected. Shows: `"{N} order(s) selected" | [Delete Selected] [Clear Selection]`. Styled in red/destructive to signal intent. Disappears when selection is cleared.

**Confirmation modal** — Reuses the existing delete modal pattern. Message: "You are about to permanently delete {N} orders. This cannot be undone." Two buttons: Cancel / Delete {N} Orders.

**After deletion** — Selected orders removed from local state. Selection cleared. Action bar disappears.

## Architecture

- **Frontend only changes** — No new API routes needed. Bulk delete calls the existing `DELETE /api/orders?id=` endpoint sequentially (one request per order). Simple, no backend changes.
- **State additions** — `selectedOrderIds: Set<string>`, `isBulkDeleting: boolean`, `showBulkDeleteModal: boolean`.
- **Admin-only** — All checkbox/selection UI is conditionally rendered with `userRole === 'admin'` guard, same as single delete.

## Data Flow

1. Admin checks rows → `selectedOrderIds` Set updates
2. Action bar appears
3. Admin clicks "Delete Selected" → confirmation modal opens
4. Admin confirms → `isBulkDeleting = true`, iterate `selectedOrderIds`, call `DELETE /api/orders?id=` for each
5. On completion → filter deleted IDs from `orders` state, clear selection, close modal

## Error Handling

- If some deletions fail and others succeed: show an alert listing how many failed, remove the successful ones from state.
- Disable all checkboxes and the delete button while `isBulkDeleting` is true.

## Constraints

- Admin role only — sellers and managers do not see checkboxes or the action bar
- Single delete (existing) remains unchanged
- No new API endpoints required
