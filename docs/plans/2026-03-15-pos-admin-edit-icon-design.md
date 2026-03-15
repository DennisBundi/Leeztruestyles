# POS Admin Edit Icon — Design

**Date:** 2026-03-15
**Status:** Approved

## Problem

When an admin is using the POS and clicks a product to open the add-to-cart modal, there is no way to quickly edit the product without leaving the POS and losing the cart.

## Solution

Add an edit (pencil) icon to the `ProductSizeColorModal` header, visible only to admins. Clicking it opens `ProductForm` as an in-place overlay on the POS page, so the cart is preserved throughout.

## Data Flow

```
POSInterface (has userRole, categories)
  └── POSProductGrid (receives isAdmin, categories)
        └── ProductSizeColorModal (receives isAdmin, onEditProduct)
              └── [edit icon click] → POSProductGrid opens ProductForm overlay
```

## Component Changes

### `ProductSizeColorModal`
- Add props: `isAdmin?: boolean`, `onEditProduct?: () => void`
- Render a pencil icon button in the modal header (next to the × close button) only when `isAdmin === true`
- On click: call `onEditProduct()`

### `POSProductGrid`
- Add props: `isAdmin: boolean`, `categories: Category[]`
- Add state: `editingProduct: Product | null`
- When `onEditProduct` fires: close size/color modal, set `editingProduct`
- Render `<ProductForm>` with `editingProduct` — it auto-opens when `product` prop is set
- On `ProductForm` `onSuccess` / `onClose`: clear `editingProduct`, call a refresh callback

### `POSInterface`
- Pass `isAdmin={userRole === 'admin'}` and `categories` into `POSProductGrid`
- Pass `onProductsRefresh={fetchProducts}` or inline the refresh into POSProductGrid's handler

## Constraints

- Edit icon is **admin-only** — `manager` and `seller` roles do not see it
- No new files, no new API endpoints
- Cart state is never touched during the edit flow
- After saving, `fetchProducts()` is called to refresh inventory on the POS grid
