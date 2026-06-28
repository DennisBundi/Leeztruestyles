# About Us Page — Image Fix Design

**Date:** 2026-06-29
**Status:** Approved

## Problem

All image sections on the About Us page render blank. The page dynamically fetches product images from Supabase and conditionally renders image slots only when `productsWithImages.length > N`. If the fetch returns no products with valid images, every image block is silently skipped.

Root causes to investigate:
- `product-images` Supabase bucket may be private (causing `getPublicUrl` URLs to 403)
- Products in the DB may genuinely have no images stored

## Goal

The About Us page should always display real product images pulled dynamically from Supabase. Images update automatically as the product catalog grows. A static fallback (`/public/images/hero-fashion.jpg`) fills any slot that still has no image after the fetch.

## Design

### Section 1: Diagnosis

Two checks before writing any code:

1. **Bucket visibility** — verify the `product-images` Supabase storage bucket is set to **public**. `getPublicUrl()` always generates a URL regardless of bucket policy; if the bucket is private the URL returns 400/403 and `next/image` silently fails.
2. **DB data** — query how many products have non-empty `images` arrays to confirm whether it's a permissions problem or a data gap.

### Section 2: Fix Root Cause

Apply only what the diagnosis identifies:

- **Bucket private** → set `product-images` to public (Supabase dashboard or SQL migration)
- **Malformed URLs** → normalize stored URLs in the upload route or via a one-off migration
- **No images in DB** → data entry gap; noted but not fixable in code

### Section 3: Improve Dynamic Fetch + Per-slot Fallback

**Query improvement** (`about/page.tsx`):
- Increase fetch limit from 6 → 10 to get more candidates
- Add `.not('images', 'eq', '[]')` filter so only products with images are returned
- Filter client-side for non-null, non-empty `images[0]` (existing logic, keep as-is)

**Per-slot fallback:**
- Remove the `productsWithImages.length > N` conditional wrappers that hide entire sections
- Each image slot renders unconditionally, using `productsWithImages[N]?.images[0] ?? '/images/hero-fashion.jpg'`
- Result: sections always render — real product photo when available, hero image as silent fallback

**No structural changes** to the page layout, sections, or copy.

## Affected Files

- `src/app/(marketplace)/about/page.tsx` — query + rendering changes
- Supabase `product-images` bucket policy (dashboard or migration) — if diagnosis confirms it's private

## Out of Scope

- Redesigning the About Us page layout
- Adding new sections or copy
- Uploading dedicated "about us" brand photos
