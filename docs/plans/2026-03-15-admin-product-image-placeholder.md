# Admin Product Image Placeholder Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the broken `/images/placeholder-product.jpg` fallback with a conditional render that shows a styled gray box + photo icon when a product has no image.

**Architecture:** The admin products page (`page.tsx`) currently always renders `<Image>` with a fallback path that doesn't exist. We replace both occurrences (table row + card view) with a conditional: `product.image` exists → `<Image>`, otherwise → styled placeholder div. This is the same pattern already used in `POSProductGrid.tsx:186-201`.

**Tech Stack:** Next.js `<Image>`, Tailwind CSS, SVG icons

---

### Task 1: Fix table row image (list view)

**Files:**
- Modify: `src/app/(admin)/dashboard/products/page.tsx:656-666`

**Step 1: Replace the `<Image>` block in the table row**

Find this block (lines 656–666):
```tsx
<div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
  <Image
    src={
      product.image ||
      "/images/placeholder-product.jpg"
    }
    alt={product.name}
    fill
    className="object-cover"
    sizes="64px"
  />
</div>
```

Replace with:
```tsx
<div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
  {product.image ? (
    <Image
      src={product.image}
      alt={product.name}
      fill
      className="object-cover"
      sizes="64px"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )}
</div>
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: no errors related to this file

---

### Task 2: Fix card view image (grid view)

**Files:**
- Modify: `src/app/(admin)/dashboard/products/page.tsx:861-873`

**Step 1: Replace the `<Image>` block in the card view**

Find this block (lines 861–873):
```tsx
{/* Product Image */}
<div className="relative w-full h-48 bg-gray-100">
  <Image
    src={
      product.image ||
      "/images/placeholder-product.jpg"
    }
    alt={product.name}
    fill
    className="object-cover"
    sizes="100vw"
  />
</div>
```

Replace with:
```tsx
{/* Product Image */}
<div className="relative w-full h-48 bg-gray-100">
  {product.image ? (
    <Image
      src={product.image}
      alt={product.name}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  )}
</div>
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/\(admin\)/dashboard/products/page.tsx
git commit -m "fix: replace missing placeholder image with conditional render in admin products"
```
