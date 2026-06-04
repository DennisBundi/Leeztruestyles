# Hero Section Redesign + Shop from China

**Date:** 2026-06-04  
**Status:** Approved

---

## Overview

Replace the current single-panel hero section on the home page with a three-panel magazine-style hero. Each panel is a full clickable link to a different destination. Simultaneously introduce a "Shop from China" feature: China-sourced products listed in the existing `products` table, filterable on the `/products` page.

---

## 1. Hero Section

### Layout

Three equal-width columns at full hero height, side by side. No carousel. No animation between panels. Each panel is an `<a>` tag covering the full panel area.

Thin top accent bar (3px) on each panel in the brand colour. Panels are separated by a 1px semi-transparent divider.

On mobile: panels stack vertically, each taking full width at reduced height (~220px each).

### Panels

| Panel | Label | Headline | Subtext | CTA | Destination |
|-------|-------|----------|---------|-----|-------------|
| Explore | NEW IN | Love at First Try | Fresh drops, every week | EXPLORE NOW → | `/products?sort=newest` |
| Shop | COLLECTION | Your New Daily Fix | The full collection | SHOP HERE → | `/products` |
| From China | DIRECT SOURCING 🇨🇳 | Shop from China | Sourced directly, shipped to you | SHOP CHINA → | `/products?china=true` |

### Visual treatment

Each panel has a **real product photo** as its background image (`object-cover`, `object-top`). A dark gradient overlay (`linear-gradient` from `rgba(0,0,0,0.65)` at bottom to transparent at top) sits over the image to keep text readable.

A tinted radial glow using the brand colour adds depth over the overlay.

Brand colour mapping:

| Panel | Top accent bar | Label / CTA border | Radial glow tint |
|-------|---------------|-------------------|-----------------|
| Explore | `#f9a8d4` → `#EC4899` | `#f9a8d4` (primary) | `rgba(249,168,212,0.18)` |
| Shop | `#EC4899` → `#DB2777` | `#EC4899` (secondary) | `rgba(236,72,153,0.20)` |
| From China | `#DB2777` → `#be123c` | `#DB2777` (secondary-dark) | `rgba(219,39,119,0.25)` |

The "From China" panel has two additional elements:
- A `● NEW` pill badge (top-right)
- A 🇨🇳 flag emoji (top-left, 60% opacity)

### Background images

Three separate images — one per panel. Stored in `/public/images/`:
- `hero-explore.jpg` — new arrivals / fashion model shot
- `hero-shop.jpg` — collection / flatlay or model shot
- `hero-china.jpg` — fabric, sourcing, or product shot

If a panel image is missing, the dark gradient background renders acceptably on its own.

### Interaction

- Hover: subtle brightness increase (`hover:brightness-110`) and scale (`hover:scale-[1.02]`) on the panel, `transition-all duration-300`
- The entire panel div is wrapped in a Next.js `<Link>` — no separate button needed

---

## 2. Shop from China — Database

### Migration

One migration on the existing `products` Supabase table:

```sql
ALTER TABLE products
  ADD COLUMN is_china_import boolean DEFAULT false NOT NULL,
  ADD COLUMN lead_time_days  integer DEFAULT null;

CREATE INDEX idx_products_china
  ON products (is_china_import)
  WHERE is_china_import = true;
```

- `is_china_import`: flags a product as China-sourced. Defaults `false` — no backfill needed for existing products.
- `lead_time_days`: nullable integer. Only set when `is_china_import = true`. Displayed as "Ships in ~X days" on the product card and detail page.

---

## 3. Products Page — Filter

### URL param

`/products?china=true` — filters the Supabase query to `.eq('is_china_import', true)`.

`/products` (no param) — returns all products as today (no change to default behaviour).

### Filter tab UI

Rendered above the product grid, below the page heading:

```
[ All Products ]   [ 🇨🇳 From China ]
```

- Active tab: filled background in the active colour (`#EC4899` for All, `#DB2777` for China), white text, no border-radius (matches existing sharp-corner style)
- Inactive tab: white background, `#e2e8f0` border, `#64748b` text
- When China filter is active: a small "Showing: China imports only · × Clear filter" label appears below the tabs

Filter tabs are rendered as Next.js `<Link>` components (not client-side JS state) so they are shareable URLs and SSR-compatible.

---

## 4. Product Cards — China Badge

When `is_china_import === true`, the `ProductCard` component renders:

1. **Image overlay badge** (top-left, over the product image): `🇨🇳 China` — dark pink background (`#DB2777`), white text, same style as the existing `NEW` badge
2. **Lead time line** (below product name, above price): `⏱ Ships in ~{lead_time_days} days` in `#DB2777`. Only shown when `lead_time_days` is not null.
3. **Card border**: `border border-pink-200 ring-1 ring-[#DB2777]` to visually distinguish China cards in a mixed grid

Non-China cards are unchanged.

---

## 5. Product Detail Page

For China products, a lead time notice is shown in the product info section (below the price, above the Add to Cart button):

```
🇨🇳 Sourced from China · Ships in ~{lead_time_days} days
```

Styled as a small pill/badge using `bg-pink-50 border border-pink-200 text-[#DB2777]`.

---

## 6. Admin Product Form

A new **SOURCING** section is added to the Add/Edit Product form in `/dashboard/products`:

- **"From China 🇨🇳" toggle** (`is_china_import`) — pink toggle, default off
- **"Lead time (days)" number input** (`lead_time_days`) — only visible when the toggle is on. Min: 1. Placeholder: `e.g. 21`

Both fields map directly to the new DB columns.

---

## 7. What Is Not Changing

- The rest of the home page (New Arrivals, Flash Sale, Fan Favourites, Importation Waitlist, Reviews) is untouched
- The existing `ImportationSection` (B2B waitlist) remains on the home page below the hero
- Order flow, checkout, payments — no changes
- Product TypeScript types need `is_china_import` and `lead_time_days` added

---

## 8. Out of Scope

- Per-product China supplier name or origin city
- A dedicated `/china` route
- Any changes to inventory tracking for China products
- Separate pricing logic for China products
