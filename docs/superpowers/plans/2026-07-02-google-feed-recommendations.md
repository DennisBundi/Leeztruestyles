# Google Shopping Feed + Smart Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Google Shopping XML feed at `/feed/google.xml` and a `ProductRecommendations` component shown on the product detail page and checkout page.

**Architecture:** The feed is a public ISR route that queries Supabase with the admin client and returns well-formed RSS 2.0 XML. Recommendations use a Postgres RPC function (`get_product_recommendations`) called via a public ISR API route; a shared client component fetches on mount and renders a horizontal scroll row of existing `ProductCard` components. JSON-LD on the product page is extended with `aggregateRating`, `sku`, and a corrected brand name.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (admin client + RPC), Tailwind CSS

## Global Constraints

- Feed URL `GET /feed/google.xml` must be publicly accessible — no auth headers
- XML must be well-formed UTF-8; `Content-Type: application/xml; charset=utf-8`
- Skip any product where `images[0]` is absent (Google rejects items without image)
- Price field must be `{number} KES` (space before currency code, no comma separators)
- `g:sale_price` only when `is_flash_sale = true`, `sale_price` is non-null, and `flash_sale_end` is in the future
- Availability: `in stock` when `inventory.stock_quantity > 0`; `out of stock` otherwise (no inventory row = out of stock)
- Recommendations component renders nothing (no heading, no empty div) when API returns 0 results
- Reuse existing `ProductCard` component — no new card design
- Admin client (`createAdminClient()`) used for both feed and recommendations API
- No new npm dependencies
- ISR `export const revalidate = 3600` on both the feed route and recommendations API route

---

### Task 1: Supabase SQL Migration — `get_product_recommendations` function

**Files:**
- Create: `supabase/migrations/20260702_get_product_recommendations.sql`

**Interfaces:**
- Produces: RPC `get_product_recommendations(p_product_id UUID, p_limit INT)` returning rows with `(id, name, price, sale_price, images, is_flash_sale, category_id)`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260702_get_product_recommendations.sql
CREATE OR REPLACE FUNCTION get_product_recommendations(
  p_product_id UUID,
  p_limit INT DEFAULT 4
)
RETURNS TABLE (
  id UUID, name TEXT, price NUMERIC, sale_price NUMERIC,
  images TEXT[], is_flash_sale BOOLEAN, category_id UUID
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id, p.name, p.price, p.sale_price,
    p.images, p.is_flash_sale, p.category_id
  FROM products p
  LEFT JOIN order_items oi ON oi.product_id = p.id
  WHERE
    p.category_id = (SELECT category_id FROM products WHERE id = p_product_id)
    AND p.id != p_product_id
    AND p.status = 'active'
    AND EXISTS (
      SELECT 1 FROM inventory i
      WHERE i.product_id = p.id AND i.stock_quantity > 0
    )
  GROUP BY p.id
  ORDER BY COUNT(oi.id) DESC, p.created_at DESC
  LIMIT p_limit;
$$;
```

- [ ] **Step 2: Run the migration in Supabase**

Open the Supabase dashboard → SQL Editor, paste the content of the migration file, and run it. Confirm the output is `Success. No rows returned.`

Alternatively run via CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Verify the function exists**

In the Supabase SQL editor run:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'get_product_recommendations';
```
Expected: one row returned.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702_get_product_recommendations.sql
git commit -m "feat: add get_product_recommendations Postgres function"
```

---

### Task 2: Google Shopping XML Feed

**Files:**
- Create: `src/app/feed/google.xml/route.ts`

**Interfaces:**
- Consumes: Supabase `products` table (all columns), `inventory` table (`product_id`, `stock_quantity`)
- Produces: `GET /feed/google.xml` → `application/xml` response

- [ ] **Step 1: Create the route file**

```ts
// src/app/feed/google.xml/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600;

const SITE_URL = 'https://leeztruestyles.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const admin = createAdminClient();

  const { data: products, error } = await admin
    .from('products')
    .select('id, name, description, price, sale_price, images, is_flash_sale, flash_sale_end, status')
    .eq('status', 'active');

  if (error || !products) {
    return new NextResponse('Failed to fetch products', { status: 500 });
  }

  const { data: inventory } = await admin
    .from('inventory')
    .select('product_id, stock_quantity');

  const stockMap = new Map<string, number>();
  for (const row of inventory ?? []) {
    stockMap.set(row.product_id, row.stock_quantity);
  }

  const now = new Date();

  const items = products
    .filter((p) => Array.isArray(p.images) && p.images[0])
    .map((p) => {
      const stockQty = stockMap.get(p.id) ?? 0;
      const availability = stockQty > 0 ? 'in stock' : 'out of stock';

      const isActiveSale =
        p.is_flash_sale &&
        p.sale_price != null &&
        p.flash_sale_end != null &&
        new Date(p.flash_sale_end) > now;

      const additionalImages = (p.images as string[])
        .slice(1, 10)
        .map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
        .join('\n');

      return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(p.description || p.name)}</g:description>
      <g:link>${SITE_URL}/products/${escapeXml(p.id)}</g:link>
      <g:image_link>${escapeXml((p.images as string[])[0])}</g:image_link>
${additionalImages ? additionalImages + '\n' : ''}      <g:availability>${availability}</g:availability>
      <g:price>${p.price} KES</g:price>
${isActiveSale ? `      <g:sale_price>${p.sale_price} KES</g:sale_price>\n` : ''}      <g:brand>Leez True Styles</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Leez True Styles</title>
    <link>${SITE_URL}</link>
    <description>Fashion clothing store in Kenya</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
```

- [ ] **Step 2: Start dev server and verify the feed**

```bash
npm run dev
```

Open `http://localhost:3000/feed/google.xml` in a browser. Confirm:
- Response is valid XML (browser renders tree view or raw XML)
- `<g:price>` values use format `1500 KES` (no comma, space before KES)
- Products without images are absent
- `Content-Type` header is `application/xml; charset=utf-8`

- [ ] **Step 3: Commit**

```bash
git add src/app/feed/google.xml/route.ts
git commit -m "feat: add Google Shopping XML feed at /feed/google.xml"
```

---

### Task 3: Extend Product Page JSON-LD (Rich Results)

**Files:**
- Modify: `src/app/(marketplace)/products/[id]/page.tsx`

**Interfaces:**
- Consumes: Supabase `reviews` table (`product_id`, `rating`) — new query added in this task
- Produces: enhanced JSON-LD with `aggregateRating`, `sku`, corrected brand name `"Leez True Styles"`

**Context:** The existing `jsonLd` object in `page.tsx` already has `brand`, `offers` with schema.org availability URLs, and `name`. Additions needed:
1. Brand name change: `'Leeztruestyles'` → `'Leez True Styles'`
2. Add `sku: params.id`
3. Add `aggregateRating` block — only when `reviewCount > 0`

- [ ] **Step 1: Add reviews query to the parallel fetch block**

In `src/app/(marketplace)/products/[id]/page.tsx`, the file currently has:
```ts
  const [productResult, inventoryResult, colorsResult, sizesResult] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).single(),
    supabase.from('inventory').select('stock_quantity, reserved_quantity').eq('product_id', params.id).single(),
    supabase.from('product_colors').select('color').eq('product_id', params.id),
    supabase.from('product_sizes').select('size, stock_quantity, reserved_quantity').eq('product_id', params.id).order('size', { ascending: true }),
  ]);
```

Replace with:
```ts
  const [productResult, inventoryResult, colorsResult, sizesResult, reviewsResult] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).single(),
    supabase.from('inventory').select('stock_quantity, reserved_quantity').eq('product_id', params.id).single(),
    supabase.from('product_colors').select('color').eq('product_id', params.id),
    supabase.from('product_sizes').select('size, stock_quantity, reserved_quantity').eq('product_id', params.id).order('size', { ascending: true }),
    supabase.from('reviews').select('rating').eq('product_id', params.id),
  ]);
```

- [ ] **Step 2: Extract destructure for reviewsResult**

After the existing destructure block (`const inventory = inventoryResult.data;` etc.), add:
```ts
  const reviews = reviewsResult.data ?? [];
  const reviewCount = reviews.length;
  const ratingValue = reviewCount > 0
    ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount
    : 0;
```

- [ ] **Step 3: Update the jsonLd object**

Replace the existing `jsonLd` object (lines 109–128):
```ts
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    sku: params.id,
    ...(imageUrl && { image: imageUrl }),
    offers: {
      '@type': 'Offer',
      price: product.sale_price || product.price,
      priceCurrency: 'KES',
      availability: availableStock === undefined || availableStock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/products/${params.id}`,
    },
    brand: {
      '@type': 'Brand',
      name: 'Leez True Styles',
    },
    ...(reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingValue.toFixed(1),
        reviewCount: String(reviewCount),
      },
    }),
  };
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(marketplace)/products/[id]/page.tsx
git commit -m "feat: extend product JSON-LD with aggregateRating, sku, and corrected brand name"
```

---

### Task 4: Recommendations API Endpoint

**Files:**
- Create: `src/app/api/products/[id]/recommendations/route.ts`

**Interfaces:**
- Consumes: `get_product_recommendations(p_product_id, p_limit)` RPC (Task 1)
- Produces: `GET /api/products/{id}/recommendations` → `{ recommendations: Product[] }`

- [ ] **Step 1: Create the route file**

```ts
// src/app/api/products/[id]/recommendations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('get_product_recommendations', {
    p_product_id: params.id,
    p_limit: 4,
  });

  if (error) {
    return NextResponse.json({ recommendations: [] });
  }

  return NextResponse.json({ recommendations: data ?? [] });
}
```

- [ ] **Step 2: Verify the endpoint responds**

With dev server running, open:
```
http://localhost:3000/api/products/<any-valid-product-uuid>/recommendations
```
Expected: `{ "recommendations": [...] }` — array may be empty if no same-category products exist.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/products/[id]/recommendations/route.ts
git commit -m "feat: add GET /api/products/[id]/recommendations endpoint"
```

---

### Task 5: ProductRecommendations Component

**Files:**
- Create: `src/components/products/ProductRecommendations.tsx`

**Interfaces:**
- Consumes: `/api/products/{productId}/recommendations` (Task 4), `ProductCard` component at `src/components/products/ProductCard.tsx`
- Produces: `<ProductRecommendations productId={string} title?={string} />` — renders nothing when 0 results

**Context:** `ProductCard` accepts `product: Product & { available_stock?, sale_price?, discount_percent?, is_flash_sale?, flash_sale_end_date? }`. The recommendations API returns `{ id, name, price, sale_price, images, is_flash_sale, category_id }` — enough to satisfy `ProductCard`'s required fields. Map these to the `Product` type using stub values for missing fields (`description: null`, `created_at: ''`, `updated_at: ''`).

- [ ] **Step 1: Read the ProductCard import path and props**

Check `src/components/products/ProductCard.tsx` top to confirm the default export name and props interface. Expected: `export default function ProductCard({ product }: { product: ... })`.

- [ ] **Step 2: Create the component**

```tsx
// src/components/products/ProductRecommendations.tsx
'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/types';

interface RecommendationProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  images: string[];
  is_flash_sale: boolean;
  category_id: string | null;
}

function toProduct(r: RecommendationProduct): Product {
  return {
    id: r.id,
    name: r.name,
    description: null,
    price: r.price,
    sale_price: r.sale_price,
    images: r.images,
    category_id: r.category_id,
    is_flash_sale: r.is_flash_sale,
    created_at: '',
    updated_at: '',
  };
}

interface Props {
  productId: string;
  title?: string;
}

export default function ProductRecommendations({ productId, title = 'You May Also Like' }: Props) {
  const [recommendations, setRecommendations] = useState<RecommendationProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${productId}/recommendations`)
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations ?? []))
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-72 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {recommendations.map((r) => (
          <div key={r.id} className="flex-shrink-0 w-56">
            <ProductCard product={toProduct(r)} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. If `ProductCard` has additional required props not covered by `Product`, add stubs to `toProduct()`.

- [ ] **Step 4: Commit**

```bash
git add src/components/products/ProductRecommendations.tsx
git commit -m "feat: add ProductRecommendations client component"
```

---

### Task 6: Wire Recommendations to Product Detail Page

**Files:**
- Modify: `src/app/(marketplace)/products/[id]/ProductDetailClient.tsx`

**Interfaces:**
- Consumes: `ProductRecommendations` component (Task 5)
- Produces: recommendations row rendered below the product description section

**Context:** `ProductDetailClient` renders the full product detail layout. The description section ends around the `product.description` block (around line 436). Add recommendations after the description block, before the "Product Features" card.

- [ ] **Step 1: Add the import**

At the top of `ProductDetailClient.tsx`, after existing imports, add:
```ts
import ProductRecommendations from '@/components/products/ProductRecommendations';
```

- [ ] **Step 2: Add the component below the description block**

Find the description block in `ProductDetailClient.tsx`:
```tsx
          {product.description && (
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Description</h2>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed text-lg">
                {product.description}
              </p>
            </div>
          )}
```

Add immediately after it (before the "Product Features" `<div className="bg-gray-50 rounded-xl p-6">`):
```tsx
          <ProductRecommendations productId={product.id} title="You May Also Like" />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Test in browser**

Navigate to any product page. The "You May Also Like" section should appear below the description (skeleton cards briefly, then real cards or nothing if no same-category products exist).

- [ ] **Step 5: Commit**

```bash
git add src/app/(marketplace)/products/[id]/ProductDetailClient.tsx
git commit -m "feat: add You May Also Like recommendations to product detail page"
```

---

### Task 7: Wire Recommendations to Checkout Page

**Files:**
- Modify: `src/app/(marketplace)/checkout/page.tsx`

**Interfaces:**
- Consumes: `ProductRecommendations` component (Task 5), `items` from `useCartStore`
- Produces: recommendations row in the order summary column, seeded from first cart item

**Context:** `checkout/page.tsx` is a client component. The `items` array from `useCartStore` holds `CartItem[]` where each item has a `.product: Product` field. The `OrderSummary` component is rendered inside a two-column layout. The recommendations should go inside the right column (order summary column), below `<OrderSummary>`.

- [ ] **Step 1: Add the import**

In `src/app/(marketplace)/checkout/page.tsx`, after existing imports, add:
```ts
import ProductRecommendations from '@/components/products/ProductRecommendations';
```

- [ ] **Step 2: Find the OrderSummary render location**

Search for `<OrderSummary` in the file. It will be inside a column div in the layout. After the closing `/>` or `</OrderSummary>` tag, add:

```tsx
              {isMounted && items.length > 0 && (
                <ProductRecommendations
                  productId={items[0].product.id}
                  title="Complete the Look"
                />
              )}
```

The `isMounted` guard prevents hydration mismatch since `items` comes from a Zustand store with localStorage persistence.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Test in browser**

Add a product to cart, navigate to `/checkout`. "Complete the Look" section should appear in the order summary column when cart has items.

- [ ] **Step 5: Commit**

```bash
git add src/app/(marketplace)/checkout/page.tsx
git commit -m "feat: add Complete the Look recommendations to checkout page"
```

---

## Post-Implementation Checklist

- [ ] Visit `https://leeztruestyles.com/feed/google.xml` after deploy — confirm valid XML with products
- [ ] Validate feed at [Google Merchant Center Feed Validator](https://merchants.google.com) or use the Rich Results Test
- [ ] Register feed in Google Merchant Center: Products → Feeds → Add feed → Scheduled fetch → URL: `https://leeztruestyles.com/feed/google.xml` → Country: Kenya, Language: English, Currency: KES
- [ ] Test product rich results at `https://search.google.com/test/rich-results` with a product URL
- [ ] Confirm `You May Also Like` renders on a product page that has same-category products
- [ ] Confirm `Complete the Look` renders on checkout with a non-empty cart
- [ ] Confirm both sections render nothing (no empty heading) when no recommendations returned
