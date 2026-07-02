# Google Shopping Feed + Smart Recommendations — Design Spec

**Date:** 2026-07-02  
**Project:** Leeztruestyles.com  
**Scope:** Two independent features delivered together — a Google Merchant Center product feed and same-page smart product recommendations.

---

## Feature 1: Google Shopping Feed + Rich Results

### Goal

Make Leeztruestyles products discoverable via Google Shopping and improve how individual products appear in organic Google search (price, availability, star rating shown in the snippet).

### Architecture

**Feed endpoint:** `GET /feed/google.xml`  
- File: `src/app/feed/google.xml/route.ts`  
- Returns a valid Google Shopping XML feed (RSS 2.0 format with Google `g:` namespace)  
- ISR: `export const revalidate = 3600` (re-fetches Supabase data at most once per hour)  
- No authentication — public URL registered in Merchant Center

**Supabase query:**  
Fetch all products where `status = 'active'`, joined with inventory (to determine availability). Use the admin client so RLS doesn't block the read.

**Feed XML structure:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Leez True Styles</title>
    <link>https://leeztruestyles.com</link>
    <description>Fashion clothing store in Kenya</description>
    <item>
      <g:id>{product.id}</g:id>
      <g:title>{product.name}</g:title>
      <g:description>{product.description || product.name}</g:description>
      <g:link>https://leeztruestyles.com/products/{product.id}</g:link>
      <g:image_link>{product.images[0]}</g:image_link>
      <!-- additional_image_link repeated for images[1..9] -->
      <g:availability>in stock | out of stock</g:availability>
      <g:price>{product.price} KES</g:price>
      <!-- g:sale_price only when is_flash_sale = true -->
      <g:brand>Leez True Styles</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
    </item>
  </channel>
</rss>
```

**Availability logic:** a product is `in stock` when its total inventory `stock_quantity > 0`. If no inventory row exists, treat as `out of stock`.

**Sale price:** included as `<g:sale_price>` only when `product.is_flash_sale = true` and `product.sale_price` is non-null and `flash_sale_end` is in the future.

**Image:** skip products with no images (don't emit the item — Google requires at least one image).

**Response headers:**  
```
Content-Type: application/xml; charset=utf-8
```

### Rich Results Improvement

File: `src/app/(marketplace)/products/[id]/page.tsx`

The existing JSON-LD `Product` schema is extended with:

1. **`aggregateRating`** — query the `reviews` table for `product_id`, compute `ratingValue` (average), `reviewCount` (count). Only include this block if `reviewCount > 0`.

```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.5",
  "reviewCount": "12"
}
```

2. **`brand`** object (already partially there — confirm it uses `@type: Brand`):

```json
"brand": { "@type": "Brand", "name": "Leez True Styles" }
```

3. **`sku`** — set to `product.id`.

4. **`offers.availability`** — use full schema.org URL: `"https://schema.org/InStock"` or `"https://schema.org/OutOfStock"`.

### Merchant Center Registration

After deploy, the owner registers the feed in Google Merchant Center:
- **Products → Feeds → Add feed**
- Type: Scheduled fetch
- URL: `https://leeztruestyles.com/feed/google.xml`
- Frequency: Daily (Google's default)
- Country: Kenya, Language: English, Currency: KES

---

## Feature 2: Smart Product Recommendations

### Goal

Show contextually relevant products on the product detail page and checkout page to increase average order value.

### Database

**New Postgres function** (run in Supabase SQL editor):

```sql
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

Falls back gracefully: if the current product has no category, returns empty. If the category has few products, returns what's available (up to limit).

### API Endpoint

**File:** `src/app/api/products/[id]/recommendations/route.ts`

- `GET /api/products/{id}/recommendations`
- Calls `get_product_recommendations(id, 4)` via admin client
- Returns `{ recommendations: Product[] }`
- No auth required (public product data)
- ISR: `export const revalidate = 3600`

### Shared Component

**File:** `src/components/products/ProductRecommendations.tsx`

- Client component (`'use client'`)
- Props: `productId: string`, `title?: string` (defaults to `"You May Also Like"`)
- Fetches `/api/products/{productId}/recommendations` on mount
- While loading: renders 4 skeleton cards matching the product card dimensions
- On success: renders a horizontal scrollable row of `ProductCard` components (reuse existing card component from the products grid)
- If 0 results: renders nothing (no heading, no empty state)

### Placements

**Product detail page** — `src/app/(marketplace)/products/[id]/ProductDetailClient.tsx`  
Add below the product description section:
```tsx
<ProductRecommendations productId={product.id} title="You May Also Like" />
```

**Checkout page** — `src/app/(marketplace)/checkout/page.tsx`  
Add inside the order summary column (right column), below `<OrderSummary>`:
```tsx
{cartItems.length > 0 && (
  <ProductRecommendations
    productId={cartItems[0].product.id}
    title="Complete the Look"
  />
)}
```
Only rendered when cart is non-empty. Uses the first cart item's product as the seed.

---

## Global Constraints

- Feed must be publicly accessible — no auth headers required by Merchant Center
- XML must be well-formed and UTF-8 encoded
- Skip any product missing `images[0]` (Google rejects items without image)
- `price` field must be `{number} KES` format with a space before the currency code
- Recommendations component must render nothing (not an empty section) when API returns 0 results
- Reuse existing `ProductCard` component — do not create a new card design
- Admin client used for both feed and recommendations API (bypasses RLS)
- No new npm dependencies
