# POS Admin Edit Icon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show an edit (pencil) icon in the POS add-to-cart modal that is only visible to admins and opens the product edit form in-place, preserving cart state.

**Architecture:** Thread `isAdmin` and `categories` from `POSInterface` (which already fetches both) down to `POSProductGrid`, then into `ProductSizeColorModal`. The modal shows a pencil icon for admins; clicking it triggers `ProductForm` to open as an overlay in `POSProductGrid` using its existing auto-open-on-product-prop behavior.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS. `ProductForm` is at `src/components/admin/ProductForm.tsx` and auto-opens when its `product` prop is non-null.

---

### Task 1: Add edit icon to `ProductSizeColorModal`

**Files:**
- Modify: `src/components/pos/ProductSizeColorModal.tsx`

**Step 1: Add props to the interface**

In `ProductSizeColorModal.tsx`, update the `ProductSizeColorModalProps` interface (lines 8–15) to add two new optional props:

```typescript
interface ProductSizeColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (size?: string, color?: string) => void;
  product: Product | null;
  availableSizes?: Array<{ size: string; available: number }>;
  availableColors?: string[];
  isAdmin?: boolean;
  onEditProduct?: () => void;
}
```

**Step 2: Destructure the new props**

In the function signature (line 17), add the two new props:

```typescript
export default function ProductSizeColorModal({
  isOpen,
  onClose,
  onConfirm,
  product,
  availableSizes = [],
  availableColors = [],
  isAdmin = false,
  onEditProduct,
}: ProductSizeColorModalProps) {
```

**Step 3: Add the edit icon button to the modal header**

The modal header is at lines 70–90 — it has the title and the × close button. Add the pencil icon button between the title `<h2>` and the close `<button>`, rendered only when `isAdmin` is true:

```tsx
<div className="flex justify-between items-center mb-4">
  <h2 className="text-xl font-bold text-gray-900">Select Options</h2>
  <div className="flex items-center gap-2">
    {isAdmin && onEditProduct && (
      <button
        onClick={onEditProduct}
        className="text-gray-400 hover:text-primary transition-colors"
        title="Edit product"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
    )}
    <button
      onClick={onClose}
      className="text-gray-400 hover:text-gray-600 transition-colors"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</div>
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add src/components/pos/ProductSizeColorModal.tsx
git commit -m "feat: add admin edit icon prop to ProductSizeColorModal"
```

---

### Task 2: Wire edit flow in `POSProductGrid`

**Files:**
- Modify: `src/components/pos/POSProductGrid.tsx`

**Step 1: Add imports**

At the top of `POSProductGrid.tsx`, add:

```typescript
import type { Category } from '@/types';
import ProductForm from '@/components/admin/ProductForm';
```

**Step 2: Update the props interface**

Replace the existing `POSProductGridProps` (lines 10–12):

```typescript
interface POSProductGridProps {
  products: (Product & { available_stock?: number })[];
  isAdmin?: boolean;
  categories?: Category[];
  onProductsRefresh?: () => void;
}
```

**Step 3: Destructure the new props**

Update the function signature (line 14):

```typescript
export default function POSProductGrid({
  products,
  isAdmin = false,
  categories = [],
  onProductsRefresh,
}: POSProductGridProps) {
```

**Step 4: Add `editingProduct` state**

After the existing `useState` declarations (around line 21), add:

```typescript
const [editingProduct, setEditingProduct] = useState<Product | null>(null);
```

**Step 5: Add the `handleEditProduct` callback**

After `handleSizeColorConfirm` (around line 154), add:

```typescript
const handleEditProduct = () => {
  setShowSizeColorModal(false);
  setEditingProduct(selectedProduct);
  setSelectedProduct(null);
};
```

**Step 6: Pass new props to `ProductSizeColorModal`**

The `ProductSizeColorModal` render is at line 158. Add the two new props:

```tsx
<ProductSizeColorModal
  isOpen={showSizeColorModal}
  onClose={() => {
    setShowSizeColorModal(false);
    setSelectedProduct(null);
  }}
  onConfirm={handleSizeColorConfirm}
  product={selectedProduct}
  availableSizes={availableSizes}
  availableColors={(selectedProduct as any)?.colors || []}
  isAdmin={isAdmin}
  onEditProduct={handleEditProduct}
/>
```

**Step 7: Render `ProductForm` overlay**

After the `<ProductSizeColorModal>` JSX and before the product grid `<div>`, add:

```tsx
{editingProduct && (
  <ProductForm
    categories={categories}
    product={editingProduct}
    userRole="admin"
    onSuccess={() => {
      setEditingProduct(null);
      onProductsRefresh?.();
    }}
    onClose={() => setEditingProduct(null)}
  />
)}
```

**Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 9: Commit**

```bash
git add src/components/pos/POSProductGrid.tsx
git commit -m "feat: wire admin edit product flow in POSProductGrid"
```

---

### Task 3: Pass `isAdmin` and `categories` from `POSInterface`

**Files:**
- Modify: `src/components/pos/POSInterface.tsx`

**Step 1: Update the `POSProductGrid` usage**

In `POSInterface.tsx`, the `<POSProductGrid>` render is at line 222. Pass the new props:

```tsx
<POSProductGrid
  products={filteredProducts}
  isAdmin={userRole === 'admin'}
  categories={categories}
  onProductsRefresh={fetchProducts}
/>
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/pos/POSInterface.tsx
git commit -m "feat: pass isAdmin and categories to POSProductGrid for edit flow"
```

---

### Task 4: Manual verification

1. Log in as **admin** → navigate to `/pos`
2. Click any product → add-to-cart modal opens
3. Confirm the pencil icon appears in the modal header (next to the × button)
4. Click the pencil icon → modal closes, `ProductForm` edit overlay opens for that product
5. Make a change and save → form closes, product grid refreshes
6. Confirm cart is **unchanged** throughout
7. Log out, log in as **manager** or **seller** → click a product → confirm **no pencil icon** appears

**Step 1: Final commit if all good**

```bash
git add .
git commit -m "feat: admin edit icon in POS add-to-cart modal"
```
