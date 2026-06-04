# Hero Redesign + Shop from China Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-panel hero with three equal-width clickable panels, and add a "From China" product flag + filter to the existing products catalogue.

**Architecture:** A DB migration adds two columns to `products`. New `HeroSection` and `ChinaFilter` components are extracted. The products page, product card, product detail, and admin form each get targeted additions — no existing logic is restructured.

**Tech Stack:** Next.js 14 App Router, Supabase (server + admin client), TypeScript, Tailwind CSS, Zod (API validation), Jest

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Create | `supabase/migrations/20260604000000_add_china_import_fields.sql` | DB migration |
| Modify | `src/types/index.ts` | Add `is_china_import`, `lead_time_days` to `Product` |
| Modify | `src/app/api/products/route.ts` | Add fields to Zod schema, insert, and update payload |
| Create | `src/components/home/HeroSection.tsx` | Three-panel hero |
| Modify | `src/app/(marketplace)/home/page.tsx` | Swap inline hero for `<HeroSection />` |
| Create | `src/components/filters/ChinaFilter.tsx` | "From China" toggle filter |
| Modify | `src/app/(marketplace)/products/page.tsx` | Add `china` param, apply filter, render `<ChinaFilter />` |
| Modify | `src/components/products/ProductCard.tsx` | China badge + lead time line |
| Modify | `src/app/(marketplace)/products/[id]/ProductDetailClient.tsx` | Lead time notice |
| Modify | `src/components/admin/ProductForm.tsx` | "From China" toggle + lead time field |
| Create | `tests/components/ProductCard.china.test.tsx` | Badge + lead time render tests |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260604000000_add_china_import_fields.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Add China import fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_china_import boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS lead_time_days   integer DEFAULT null;

CREATE INDEX IF NOT EXISTS idx_products_china
  ON products (is_china_import)
  WHERE is_china_import = true;
```

- [ ] **Step 2: Run the migration in Supabase**

Open the Supabase dashboard → SQL Editor → paste and run the migration above.

Or run via CLI:
```bash
npx supabase db push
```

Expected: no errors; `products` table now has `is_china_import` and `lead_time_days` columns.

- [ ] **Step 3: Verify the columns exist**

Run in Supabase SQL Editor:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('is_china_import', 'lead_time_days');
```

Expected output: two rows — `is_china_import boolean false` and `lead_time_days integer null`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604000000_add_china_import_fields.sql
git commit -m "feat(db): add is_china_import and lead_time_days to products"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/index.ts:3-19`

- [ ] **Step 1: Add the two new fields to the `Product` interface**

In `src/types/index.ts`, update the `Product` interface from:

```typescript
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  buying_price?: number | null;
  sale_price?: number | null;
  images: string[];
  category_id: string | null;
  created_at: string;
  updated_at: string;
  is_flash_sale?: boolean;
  flash_sale_start?: string | null;
  flash_sale_end?: string | null;
  status?: "active" | "inactive";
  source?: "admin" | "pos";
}
```

to:

```typescript
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  buying_price?: number | null;
  sale_price?: number | null;
  images: string[];
  category_id: string | null;
  created_at: string;
  updated_at: string;
  is_flash_sale?: boolean;
  flash_sale_start?: string | null;
  flash_sale_end?: string | null;
  status?: "active" | "inactive";
  source?: "admin" | "pos";
  is_china_import?: boolean;
  lead_time_days?: number | null;
}
```

- [ ] **Step 2: Run type-check to confirm no errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add is_china_import and lead_time_days to Product"
```

---

## Task 3: API Route — Schema + Insert + Update

**Files:**
- Modify: `src/app/api/products/route.ts`

- [ ] **Step 1: Add fields to the Zod schema**

In `src/app/api/products/route.ts`, after the `source` field in `productSchema` (around line 93), add:

```typescript
  is_china_import: z.boolean().optional().default(false),
  lead_time_days: z
    .union([z.number().int().positive(), z.null()])
    .optional()
    .nullable()
    .transform((val) => val ?? null),
```

The schema block at that point should look like:

```typescript
  source: z.enum(["admin", "pos"]).optional().default("admin"),
  is_china_import: z.boolean().optional().default(false),
  lead_time_days: z
    .union([z.number().int().positive(), z.null()])
    .optional()
    .nullable()
    .transform((val) => val ?? null),
});
```

- [ ] **Step 2: Add fields to the POST insert payload**

In the `POST` handler, in `productInsert` (around line 120), add after `source`:

```typescript
      is_china_import: validated.is_china_import ?? false,
      lead_time_days: validated.lead_time_days ?? null,
```

The insert block should look like:

```typescript
    const productInsert: any = {
      name: validated.name,
      description: validated.description || null,
      price: validated.price,
      sale_price: validated.sale_price || null,
      category_id: validated.category_id || null,
      images: validated.images || [],
      status: validated.status || "active",
      is_flash_sale: validated.is_flash_sale || false,
      flash_sale_start: validated.flash_sale_start || null,
      flash_sale_end: validated.flash_sale_end || null,
      source: validated.source || "admin",
      is_china_import: validated.is_china_import ?? false,
      lead_time_days: validated.lead_time_days ?? null,
    };
```

- [ ] **Step 3: Add fields to the PUT update payload**

In the `PUT` handler, after the `flash_sale_end` block (around line 749), add:

```typescript
    if (updateData.is_china_import !== undefined) {
      updatePayload.is_china_import = updateData.is_china_import;
    }
    if (updateData.lead_time_days !== undefined) {
      updatePayload.lead_time_days = updateData.lead_time_days ?? null;
    }
```

- [ ] **Step 4: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/products/route.ts
git commit -m "feat(api): add is_china_import and lead_time_days to products API"
```

---

## Task 4: HeroSection Component

**Files:**
- Create: `src/components/home/HeroSection.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/HeroSection.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import HeroSection from "@/components/home/HeroSection";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("HeroSection", () => {
  it("renders three panels with correct destinations", () => {
    render(<HeroSection />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/products?sort=newest");
    expect(hrefs).toContain("/products");
    expect(hrefs).toContain("/products?china=true");
  });

  it("renders panel headlines", () => {
    render(<HeroSection />);
    expect(screen.getByText(/Love at First Try/i)).toBeInTheDocument();
    expect(screen.getByText(/Your New Daily Fix/i)).toBeInTheDocument();
    expect(screen.getByText(/Shop from China/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest tests/components/HeroSection.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/home/HeroSection'`

- [ ] **Step 3: Create the HeroSection component**

Create `src/components/home/HeroSection.tsx`:

```typescript
import Link from "next/link";

const panels = [
  {
    label: "NEW IN",
    headline: "Love at\nFirst Try",
    sub: "Fresh drops, every week",
    cta: "EXPLORE NOW",
    href: "/products?sort=newest",
    image: "/images/hero-explore.jpg",
    fallbackBg: "linear-gradient(170deg,#1a0a12 0%,#3d1a2e 40%,#5e2244 100%)",
    accentBar: "linear-gradient(90deg,#f9a8d4,#EC4899)",
    glowColor: "rgba(249,168,212,0.18)",
    labelColor: "rgba(249,168,212,0.6)",
    labelBorder: "rgba(249,168,212,0.4)",
    ctaBorder: "#f9a8d4",
    ctaBg: "rgba(249,168,212,0.2)",
  },
  {
    label: "COLLECTION",
    headline: "Your New\nDaily Fix",
    sub: "The full collection",
    cta: "SHOP HERE",
    href: "/products",
    image: "/images/hero-shop.jpg",
    fallbackBg: "linear-gradient(170deg,#1a0818 0%,#3d0e30 40%,#6b1654 100%)",
    accentBar: "linear-gradient(90deg,#EC4899,#DB2777)",
    glowColor: "rgba(236,72,153,0.20)",
    labelColor: "rgba(244,114,182,0.8)",
    labelBorder: "rgba(236,72,153,0.4)",
    ctaBorder: "#EC4899",
    ctaBg: "rgba(236,72,153,0.2)",
  },
  {
    label: "DIRECT SOURCING",
    headline: "Shop from\nChina",
    sub: "Sourced directly, shipped to you",
    cta: "SHOP CHINA",
    href: "/products?china=true",
    image: "/images/hero-china.jpg",
    fallbackBg: "linear-gradient(170deg,#1a0008 0%,#4a0820 40%,#7c0a28 100%)",
    accentBar: "linear-gradient(90deg,#DB2777,#be123c)",
    glowColor: "rgba(219,39,119,0.25)",
    labelColor: "rgba(249,168,212,0.7)",
    labelBorder: "rgba(219,39,119,0.4)",
    ctaBorder: "#DB2777",
    ctaBg: "rgba(219,39,119,0.2)",
    isChina: true,
  },
];

export default function HeroSection() {
  return (
    <section className="flex flex-col md:flex-row min-h-[420px] md:h-[520px]">
      {panels.map((panel, i) => (
        <Link
          key={panel.href}
          href={panel.href}
          className="relative flex-1 overflow-hidden group block"
          style={{ background: panel.fallbackBg }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url('${panel.image}')` }}
          />

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Brand-colour radial glow */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 40% 25%, ${panel.glowColor} 0%, transparent 65%)`,
            }}
          />

          {/* Top accent bar */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: panel.accentBar }}
          />

          {/* Divider (between panels, not after last) */}
          {i < panels.length - 1 && (
            <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-white/10 z-10 hidden md:block" />
          )}

          {/* China-only: flag + NEW badge */}
          {panel.isChina && (
            <>
              <span className="absolute top-4 left-4 text-2xl opacity-60 z-10">
                🇨🇳
              </span>
              <span
                className="absolute top-4 right-4 z-10 text-[10px] font-bold tracking-widest px-2 py-1 rounded-full border"
                style={{
                  background: "rgba(219,39,119,0.2)",
                  borderColor: "rgba(219,39,119,0.5)",
                  color: "#f9a8d4",
                }}
              >
                ● NEW
              </span>
            </>
          )}

          {/* Label pill */}
          <div
            className="absolute top-4 left-4 z-10 text-[9px] font-bold tracking-[2px] px-3 py-1 rounded-full border"
            style={{
              background: `${panel.glowColor}`,
              borderColor: panel.labelBorder,
              color: panel.labelColor,
              display: panel.isChina ? "none" : undefined,
            }}
          >
            {panel.label}
          </div>

          {/* Text content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-1 tracking-tight whitespace-pre-line">
              {panel.headline}
            </h2>
            <p className="text-white/65 text-xs mb-4">{panel.sub}</p>
            <span
              className="inline-block text-[10px] font-bold tracking-[1.5px] text-white px-3 py-2 border transition-all duration-200 group-hover:bg-white group-hover:text-gray-900"
              style={{
                borderColor: panel.ctaBorder,
                background: panel.ctaBg,
              }}
            >
              {panel.cta} →
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx jest tests/components/HeroSection.test.tsx --no-coverage
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/HeroSection.tsx tests/components/HeroSection.test.tsx
git commit -m "feat(hero): add three-panel HeroSection component"
```

---

## Task 5: Replace Hero in Home Page

**Files:**
- Modify: `src/app/(marketplace)/home/page.tsx:1-10` (imports) and `:203-231` (hero section)

- [ ] **Step 1: Add the HeroSection import**

In `src/app/(marketplace)/home/page.tsx`, add to the imports at the top:

```typescript
import HeroSection from "@/components/home/HeroSection";
```

- [ ] **Step 2: Replace the inline hero section**

In `src/app/(marketplace)/home/page.tsx`, remove the entire `{/* Hero Section */}` block (lines 202–231):

```typescript
      {/* Hero Section */}
      <section className="relative text-white min-h-[calc(60vh+150px)] flex items-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-fashion.jpg')" }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/50" />

        <div className="container mx-auto px-4 text-center relative z-10 animate-slide-up w-full py-24 md:py-0">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Dress Like You{" "}
            <span className="bg-white/20 px-4 py-2 rounded-2xl">
              Mean It
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-2xl mx-auto">
            Bold, fresh styles for the woman who walks in and owns the room. Shop Nairobi&apos;s go-to fashion destination.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-block px-8 py-4 bg-white text-primary rounded-none font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Shop the Collection
            </Link>
          </div>
        </div>
      </section>
```

Replace it with:

```typescript
      {/* Hero Section */}
      <HeroSection />
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(marketplace)/home/page.tsx
git commit -m "feat(home): replace single hero with HeroSection three-panel component"
```

---

## Task 6: ChinaFilter Component

**Files:**
- Create: `src/components/filters/ChinaFilter.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ChinaFilter.test.tsx`:

```typescript
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import ChinaFilter from "@/components/filters/ChinaFilter";

describe("ChinaFilter", () => {
  it("shows 'All Products' as active when no china param", () => {
    render(<ChinaFilter />);
    const allBtn = screen.getByRole("button", { name: /All Products/i });
    expect(allBtn.className).toMatch(/bg-\[#EC4899\]|bg-secondary/);
  });

  it("renders the From China button", () => {
    render(<ChinaFilter />);
    expect(screen.getByRole("button", { name: /From China/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest tests/components/ChinaFilter.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/filters/ChinaFilter'`

- [ ] **Step 3: Create the ChinaFilter component**

Create `src/components/filters/ChinaFilter.tsx`:

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ChinaFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChinaActive = searchParams.get("china") === "true";

  const navigate = (china: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (china) {
      params.set("china", "true");
    } else {
      params.delete("china");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  };

  const baseClass =
    "px-5 py-2.5 text-sm font-semibold transition-all duration-200 border-2";
  const activeClass = "text-white border-transparent";
  const inactiveClass =
    "bg-white text-gray-600 border-gray-200 hover:border-primary/40";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(false)}
        className={`${baseClass} ${!isChinaActive ? `${activeClass} bg-[#EC4899]` : inactiveClass}`}
      >
        All Products
      </button>
      <button
        onClick={() => navigate(true)}
        className={`${baseClass} ${isChinaActive ? `${activeClass} bg-[#DB2777]` : inactiveClass}`}
      >
        🇨🇳 From China
      </button>
      {isChinaActive && (
        <span className="text-xs text-[#DB2777] font-medium ml-1">
          Showing China imports
          <button
            onClick={() => navigate(false)}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear China filter"
          >
            ×
          </button>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx jest tests/components/ChinaFilter.test.tsx --no-coverage
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/filters/ChinaFilter.tsx tests/components/ChinaFilter.test.tsx
git commit -m "feat(filters): add ChinaFilter toggle component"
```

---

## Task 7: Products Page — China Filter

**Files:**
- Modify: `src/app/(marketplace)/products/page.tsx`

- [ ] **Step 1: Add `china` to `SearchParams` interface**

In `src/app/(marketplace)/products/page.tsx`, update the `SearchParams` interface:

```typescript
interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  color?: string;
  page?: string;
  flash_sale?: string;
  china?: string;
  sort?: string;
}
```

- [ ] **Step 2: Add china filter and sort to the Supabase query**

In the same file, after the `flash_sale` filter block (around line 80), add:

```typescript
  if (searchParams.china === "true") {
    query = query.eq("is_china_import", true);
  }
```

And change the final `.order()` call from:

```typescript
  const { data: products, error } = await query.order("created_at", {
    ascending: false,
  });
```

to:

```typescript
  const { data: products, error } = await query.order("created_at", {
    ascending: searchParams.sort === "oldest",
  });
```

This keeps newest-first as the default (matching the Explore panel's `?sort=newest`).

- [ ] **Step 3: Import and render ChinaFilter**

Add the import at the top of the file:

```typescript
import ChinaFilter from "@/components/filters/ChinaFilter";
```

In the JSX, add `<ChinaFilter />` below the existing filter row (after `<ClearFiltersButton />`), wrapped to make it a separate row:

```typescript
        {/* China source filter */}
        <div className="flex justify-center mt-2">
          <ChinaFilter />
        </div>
```

The filters block should look like:

```typescript
      <div className="mb-8 space-y-4 animate-slide-up">
        <SearchBar />
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 justify-center items-center">
          <CategoryFilter categories={(categories || []) as any} />
          <PriceFilter />
          <ColorFilter availableColors={Array.from(allAvailableColors).sort()} />
          <ClearFiltersButton />
        </div>
        {/* China source filter */}
        <div className="flex justify-center mt-2">
          <ChinaFilter />
        </div>
      </div>
```

- [ ] **Step 4: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(marketplace)/products/page.tsx
git commit -m "feat(products): add China filter param and ChinaFilter UI"
```

---

## Task 8: ProductCard — China Badge + Lead Time

**Files:**
- Modify: `src/components/products/ProductCard.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/ProductCard.china.test.tsx`:

```typescript
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock("@/store/cartStore", () => ({
  useCartStore: () => ({ addItem: jest.fn(), items: [] }),
}));
jest.mock("@/components/cart/CartAnimationProvider", () => ({
  useCartAnimationContext: () => ({ triggerAnimation: jest.fn() }),
}));

import ProductCard from "@/components/products/ProductCard";

const baseProduct = {
  id: "1",
  name: "Test Dress",
  description: "A dress",
  price: 2000,
  images: [],
  category_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("ProductCard — China import", () => {
  it("does NOT show China badge for regular products", () => {
    render(<ProductCard product={{ ...baseProduct, is_china_import: false }} />);
    expect(screen.queryByText(/🇨🇳/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ships in/i)).not.toBeInTheDocument();
  });

  it("shows China badge when is_china_import is true", () => {
    render(<ProductCard product={{ ...baseProduct, is_china_import: true }} />);
    expect(screen.getByText(/🇨🇳 China/i)).toBeInTheDocument();
  });

  it("shows lead time when is_china_import and lead_time_days are set", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, is_china_import: true, lead_time_days: 21 }}
      />
    );
    expect(screen.getByText(/Ships in ~21 days/i)).toBeInTheDocument();
  });

  it("does not show lead time when lead_time_days is null", () => {
    render(
      <ProductCard
        product={{ ...baseProduct, is_china_import: true, lead_time_days: null }}
      />
    );
    expect(screen.queryByText(/Ships in/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest tests/components/ProductCard.china.test.tsx --no-coverage
```

Expected: FAIL — `🇨🇳 China` not found.

- [ ] **Step 3: Add China badge to ProductCard**

In `src/components/products/ProductCard.tsx`, inside the image area div, add the China badge after the flash sale badge (after line 217):

```typescript
      {/* China Import Badge */}
      {product.is_china_import && (
        <div className="absolute top-4 left-4 z-20 bg-[#DB2777] text-white px-3 py-1 text-xs font-bold shadow">
          🇨🇳 China
        </div>
      )}
```

Note: if `isOnSale` is also true, the flash sale badge will overlap. Place the China badge on the right side instead when both are present by using `left-4` only when `!isOnSale` and `right-4` when `isOnSale`. Update the condition to:

```typescript
      {/* China Import Badge */}
      {product.is_china_import && (
        <div
          className={`absolute top-4 z-20 bg-[#DB2777] text-white px-3 py-1 text-xs font-bold shadow ${
            isOnSale ? "right-4" : "left-4"
          }`}
        >
          🇨🇳 China
        </div>
      )}
```

- [ ] **Step 4: Add lead time below the product name**

In `src/components/products/ProductCard.tsx`, in the card body `<div className="p-3 sm:p-4 md:p-5">`, add a lead time line after the `<h3>` name element:

```typescript
        {/* Lead time for China imports */}
        {product.is_china_import && product.lead_time_days && (
          <p className="text-xs font-semibold text-[#DB2777] mb-1.5">
            ⏱ Ships in ~{product.lead_time_days} days
          </p>
        )}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
npx jest tests/components/ProductCard.china.test.tsx --no-coverage
```

Expected: PASS — 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/products/ProductCard.tsx tests/components/ProductCard.china.test.tsx
git commit -m "feat(product-card): add China badge and lead time display"
```

---

## Task 9: Product Detail Page — Lead Time Notice

**Files:**
- Modify: `src/app/(marketplace)/products/[id]/ProductDetailClient.tsx`

- [ ] **Step 1: Locate the price + Add to Cart area**

In `ProductDetailClient.tsx`, find where the price and Add to Cart button are rendered. Search for `AddToCartButton` — it's rendered somewhere in the JSX.

- [ ] **Step 2: Add the lead time notice above AddToCartButton**

Find the `<AddToCartButton` element and add immediately before it:

```typescript
                {/* China import lead time notice */}
                {product.is_china_import && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-pink-50 border border-pink-200 text-[#DB2777] text-sm font-medium mb-4 rounded-none">
                    <span className="text-base">🇨🇳</span>
                    <span>
                      Sourced from China
                      {product.lead_time_days
                        ? ` · Ships in ~${product.lead_time_days} days`
                        : ""}
                    </span>
                  </div>
                )}
```

- [ ] **Step 3: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. (The `EnhancedProduct` type extends `Product` which now has `is_china_import` and `lead_time_days`.)

- [ ] **Step 4: Commit**

```bash
git add src/app/(marketplace)/products/[id]/ProductDetailClient.tsx
git commit -m "feat(product-detail): show China sourcing notice with lead time"
```

---

## Task 10: Admin ProductForm — China Toggle + Lead Time Field

**Files:**
- Modify: `src/components/admin/ProductForm.tsx`

- [ ] **Step 1: Add China fields to formData state**

In `src/components/admin/ProductForm.tsx`, update the `formData` initial state (around line 49) to include the new fields:

```typescript
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    buying_price: product?.buying_price || "",
    sale_price: product?.sale_price || "",
    category_id: product?.category_id || "",
    initial_stock: product ? "" : "",
    size_stocks: {
      S: "",
      M: "",
      L: "",
      XL: "",
      "2XL": "",
      "3XL": "",
      "4XL": "",
      "5XL": "",
    },
    status: product?.status || "active",
    is_flash_sale: product?.is_flash_sale || false,
    flash_sale_start: product?.flash_sale_start
      ? new Date(product.flash_sale_start).toISOString().slice(0, 16)
      : "",
    flash_sale_end: product?.flash_sale_end
      ? new Date(product.flash_sale_end).toISOString().slice(0, 16)
      : "",
    is_china_import: product?.is_china_import || false,
    lead_time_days: product?.lead_time_days?.toString() || "",
  });
```

- [ ] **Step 2: Add the fields to requestBody**

In `handleSubmit`, find the `requestBody` object (around line 694) and add the two new fields:

```typescript
      const requestBody = {
        ...formData,
        id: product?.id,
        price: parseFloat(formData.price.toString()),
        buying_price: buyingPriceValue,
        sale_price: formData.sale_price
          ? parseFloat(formData.sale_price.toString())
          : null,
        initial_stock: initialStockValue,
        size_stocks: hasSizeStocks ? sizeStocks : null,
        colors: selectedColors.length > 0 ? selectedColors : null,
        color_stocks: hasColorStocks ? colorStocksData : null,
        images,
        flash_sale_start:
          formData.is_flash_sale && formData.flash_sale_start
            ? new Date(formData.flash_sale_start).toISOString()
            : null,
        flash_sale_end:
          formData.is_flash_sale && formData.flash_sale_end
            ? new Date(formData.flash_sale_end).toISOString()
            : null,
        is_china_import: formData.is_china_import,
        lead_time_days: formData.is_china_import && formData.lead_time_days
          ? parseInt(formData.lead_time_days)
          : null,
      };
```

- [ ] **Step 3: Add the SOURCING section to the form UI**

In the form JSX (around line 852, inside the `<form>` element), find a good location — after the Flash Sale section. Add a new section:

```typescript
              {/* SOURCING section */}
              <div className="col-span-1 md:col-span-2 border border-pink-100 rounded-none p-4">
                <h3 className="text-xs font-bold tracking-widest text-[#DB2777] mb-4 uppercase">
                  Sourcing
                </h3>

                {/* From China toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      From China 🇨🇳
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Product sourced directly from China
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.is_china_import}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        is_china_import: !prev.is_china_import,
                        lead_time_days: !prev.is_china_import
                          ? prev.lead_time_days
                          : "",
                      }))
                    }
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
                      formData.is_china_import ? "bg-[#DB2777]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                        formData.is_china_import
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Lead time — only shown when toggle is on */}
                {formData.is_china_import && (
                  <div className="bg-pink-50 border border-pink-100 rounded-none p-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Lead time (days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 21"
                      value={formData.lead_time_days}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lead_time_days: e.target.value,
                        }))
                      }
                      className="w-28 px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#DB2777] focus:ring-1 focus:ring-[#DB2777]"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Shown as "Ships in ~{formData.lead_time_days || "?"} days"
                      on product listings
                    </p>
                  </div>
                )}
              </div>
```

- [ ] **Step 4: Run type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ProductForm.tsx
git commit -m "feat(admin): add From China toggle and lead time field to ProductForm"
```

---

## Task 11: Run Full Test Suite + Manual Verification

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all existing tests pass + new tests (HeroSection, ChinaFilter, ProductCard.china) pass.

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Verify the hero section**

Open `http://localhost:3000`. Confirm:
- Three equal-width panels visible
- Each panel has a top accent bar in the brand colour
- "From China" panel has 🇨🇳 flag and "NEW" badge
- Clicking "Explore" navigates to `/products?sort=newest`
- Clicking "Shop" navigates to `/products`
- Clicking "From China" navigates to `/products?china=true`
- On mobile (resize to < 768px): panels stack vertically

- [ ] **Step 4: Verify the products page filter**

Open `http://localhost:3000/products`. Confirm:
- "All Products" and "🇨🇳 From China" buttons visible below the existing filters
- "All Products" is active (pink background) by default
- Clicking "🇨🇳 From China" → URL becomes `/products?china=true`, button turns `#DB2777`
- "Showing China imports" label appears with × to clear
- Product grid updates (empty if no China products yet — that's expected)

- [ ] **Step 5: Verify admin form**

Open `http://localhost:3000/dashboard/products` and open Add/Edit Product. Confirm:
- "SOURCING" section visible at the bottom
- Toggle off by default
- Clicking toggle turns it pink and reveals "Lead time (days)" input
- Preview text updates as you type

- [ ] **Step 6: End-to-end test — create a China product**

In the admin form, create a product with:
- Name: "Test China Dress"
- Price: 1500
- From China: ON
- Lead time: 21

Save it. Then:
1. Open `/products` — product appears with 🇨🇳 China badge and "⏱ Ships in ~21 days"
2. Click "🇨🇳 From China" filter — only this product shows
3. Click the product — detail page shows "🇨🇳 Sourced from China · Ships in ~21 days" notice

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: ship hero redesign and Shop from China feature"
```
