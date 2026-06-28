# About Us Page — Image Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the About Us page so product images always display dynamically from Supabase, with a static fallback for any slot that comes up empty.

**Architecture:** Diagnose the root cause (bucket permissions vs. missing data), apply the targeted fix (SQL migration to make the bucket public + add a read policy), then update `about/page.tsx` to improve the query and render each image slot unconditionally with a per-slot fallback.

**Tech Stack:** Next.js App Router (server component), Supabase storage + DB, `next/image`

## Global Constraints

- No layout or copy changes to the About Us page — only image rendering logic
- All image slots must render unconditionally (no section hidden when images are unavailable)
- Fallback image: `/images/hero-fashion.jpg` (already in `/public/images/`)
- Follow existing migration file naming: `YYYYMMDDHHMMSS_description.sql`
- Single branch workflow — commit directly to `main`

---

### Task 1: Diagnose — Bucket Visibility and DB Data

**Files:**
- No file changes — diagnosis only

**Goal:** Confirm whether the `product-images` bucket is private, and whether products in the DB actually have images stored.

- [ ] **Step 1: Check bucket visibility in Supabase dashboard**

Go to: **Supabase Dashboard → Storage → Buckets → product-images**

Look for the padlock icon or "Public" label next to the bucket name.
- If the bucket shows a padlock (private) → bucket is the problem. Proceed to Task 2.
- If the bucket shows "Public" → bucket is fine. The issue is in the data. Check Step 2.

- [ ] **Step 2: Check how many products have images in the DB**

Run this in the Supabase SQL Editor (**Dashboard → SQL Editor → New Query**):

```sql
SELECT
  COUNT(*) AS total_products,
  COUNT(*) FILTER (WHERE images IS NOT NULL AND array_length(images, 1) > 0) AS products_with_images,
  COUNT(*) FILTER (WHERE images IS NULL OR array_length(images, 1) = 0 OR images = '{}') AS products_without_images
FROM products;
```

Expected outcome if data is good: `products_with_images` > 0.

- [ ] **Step 3: Spot-check an image URL**

Run this to get a sample URL:

```sql
SELECT id, name, images[1] AS first_image FROM products
WHERE images IS NOT NULL AND array_length(images, 1) > 0
LIMIT 3;
```

Copy one of the URLs and paste it directly into your browser. If it loads → URL is valid. If it returns 403/400 → bucket is private even if the dashboard shows "Public". Proceed to Task 2 regardless.

- [ ] **Step 4: Note findings**

Record:
- Bucket status: private / public
- `products_with_images` count
- Whether sample URLs load in the browser

Proceed to Task 2 even if both look fine — the migration in Task 2 is idempotent and ensures correctness.

---

### Task 2: Fix — Make `product-images` Bucket Public

**Files:**
- Create: `supabase/migrations/20260629000000_make_product_images_public.sql`

**Goal:** Ensure the `product-images` bucket is public and has a `SELECT` policy for all users so `getPublicUrl()` URLs serve images correctly.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260629000000_make_product_images_public.sql`:

```sql
-- Make product-images bucket public so getPublicUrl() URLs serve correctly
UPDATE storage.buckets
SET public = true
WHERE id = 'product-images';

-- Allow anyone to read objects in product-images (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read of product-images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Allow public read of product-images"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'product-images');
    $policy$;
  END IF;
END $$;
```

- [ ] **Step 2: Run the migration in Supabase SQL Editor**

Copy the entire file contents and paste into **Supabase Dashboard → SQL Editor → New Query**, then click **Run**.

Expected output: `Success. No rows returned.`

- [ ] **Step 3: Verify the fix**

Re-run the spot-check URL from Task 1 Step 3 in your browser. It should now load the image (HTTP 200). If it still 403s, double-check the bucket name — it must be exactly `product-images`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260629000000_make_product_images_public.sql
git commit -m "fix: make product-images storage bucket public"
```

---

### Task 3: Update About Page — Better Query + Per-slot Fallback

**Files:**
- Modify: `src/app/(marketplace)/about/page.tsx`

**Goal:** Fetch up to 10 products that have images, then render each image slot unconditionally — real product photo when available, `/images/hero-fashion.jpg` as a silent fallback.

- [ ] **Step 1: Update the Supabase query**

In `src/app/(marketplace)/about/page.tsx`, replace the existing query (lines 19–32) with:

```tsx
const { data: products } = await supabase
  .from("products")
  .select("id, name, images, price")
  .not("images", "eq", "{}")
  .not("images", "is", null)
  .limit(10)
  .order("created_at", { ascending: false });

const productsWithImages = (products || []).filter(
  (product: any) =>
    product.images &&
    Array.isArray(product.images) &&
    product.images.length > 0 &&
    product.images[0]
);
```

- [ ] **Step 2: Add the fallback constant**

Directly below the `productsWithImages` definition, add:

```tsx
const FALLBACK = '/images/hero-fashion.jpg';

const img = (index: number): string =>
  productsWithImages[index]?.images[0] ?? FALLBACK;

const isSupabase = (src: string) =>
  src.includes('pklbqruulnpalzxurznr.supabase.co');
```

- [ ] **Step 3: Fix the "Our Story" image slot**

Find the "Our Story" section. Replace:

```tsx
{productsWithImages.length > 0 && (
  <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
    <Image
      src={productsWithImages[0]?.images[0]}
      alt={productsWithImages[0]?.name || "Fashion item"}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 50vw"
      unoptimized={productsWithImages[0]?.images[0]?.includes("unsplash.com")}
    />
  </div>
)}
```

With:

```tsx
<div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
  <Image
    src={img(0)}
    alt={productsWithImages[0]?.name || "Fashion item"}
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 50vw"
    unoptimized={!isSupabase(img(0))}
  />
</div>
```

- [ ] **Step 4: Fix the "Our Mission" image slot**

Find the "Our Mission" section. Replace:

```tsx
{productsWithImages.length > 1 && (
  <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg order-2 md:order-1">
    <Image
      src={productsWithImages[1]?.images[0]}
      alt={productsWithImages[1]?.name || "Fashion item"}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 50vw"
      unoptimized={productsWithImages[1]?.images[0]?.includes("unsplash.com")}
    />
  </div>
)}
```

With:

```tsx
<div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg order-2 md:order-1">
  <Image
    src={img(1)}
    alt={productsWithImages[1]?.name || "Fashion item"}
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 50vw"
    unoptimized={!isSupabase(img(1))}
  />
</div>
```

- [ ] **Step 5: Fix the "Our Values" gallery**

Find the "Our Values" gallery section. Replace:

```tsx
{productsWithImages.length > 2 && (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
    {productsWithImages.slice(2, 6).map((product: any, index: number) => (
      <div key={product.id} className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized={product.images[0]?.includes("unsplash.com")}
        />
      </div>
    ))}
  </div>
)}
```

With:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
  {[2, 3, 4, 5].map((index) => (
    <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
      <Image
        src={img(index)}
        alt={productsWithImages[index]?.name || "Fashion item"}
        fill
        className="object-cover group-hover:scale-110 transition-transform duration-500"
        sizes="(max-width: 768px) 50vw, 25vw"
        unoptimized={!isSupabase(img(index))}
      />
    </div>
  ))}
</div>
```

- [ ] **Step 6: Verify the page renders correctly**

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000/about` in your browser. Confirm:
- "Our Story" section shows an image (product photo or hero fallback)
- "Our Mission" section shows an image
- "Our Values" gallery shows 4 images
- No blank image slots

- [ ] **Step 7: Commit**

```bash
git add "src/app/(marketplace)/about/page.tsx"
git commit -m "fix: always render about page images with per-slot fallback"
```

---

### Task 4: Push and Verify on Production

- [ ] **Step 1: Push to origin**

```bash
git push
```

- [ ] **Step 2: Verify on live site**

Once Vercel finishes deploying, open the live About Us page and confirm all 6 image slots render. Check browser DevTools → Network tab and filter by `img` — confirm no 403/404 responses for image URLs.
