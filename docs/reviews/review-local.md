# Code Review: Local Changes

**Reviewed:** 2026-03-09
**Files changed:** 40+

## Summary

- Total findings: 13
- Blocker: 0 | Major: 8 | Minor: 5

---

## `src/app/(marketplace)/home/page.tsx`

---

### Lines 23-148

```typescript
function hasValidImage(product: any): boolean {
// ...
function filterProducts(products: any[], inventoryMap: Map<string, number>): any[] {
// ...
function buildInventoryMap(inventory: any[] | null): Map<string, number> {
// ...
let adminClient: any = null;
// ...
const orderIds = completedOrders.map((o: any) => o.id);
// ...
salesDataResult.forEach((item: any) => {
// ...
let featuredProducts: any[] = [];
```

**Major: Type Safety**

Seven uses of `any` across helper functions and variables in this file, when `Product` and `Inventory` interfaces exist in `@/types`. Using `any` bypasses all TypeScript checks — if the `Product` interface changes (e.g., `image` renamed), these functions silently break at runtime instead of failing at compile time. Every Supabase query result and product iteration loses type safety downstream.

```typescript
import type { Product } from '@/types';

function hasValidImage(product: Product): boolean {
function filterProducts(products: Product[], inventoryMap: Map<string, number>): (Product & { available_stock?: number })[] {
function buildInventoryMap(inventory: Pick<Inventory, 'product_id' | 'stock_quantity' | 'reserved_quantity'>[] | null): Map<string, number> {
let adminClient: ReturnType<typeof createAdminClient> | null = null;
const orderIds = completedOrders.map((o: { id: string }) => o.id);
salesDataResult.forEach((item: { product_id: string; order_id: string; quantity: number }) => {
let featuredProducts: Product[] = [];
```

<!-- agent:TypeSafety confidence:0.95 -->

---

### Line 70

```typescript
const [newArrivalsResult, flashSaleResult, salesDataResult] = await Promise.all([
```

**Major: Error Handling**

If any of the three parallel Supabase queries throws (e.g., network timeout), Promise.all rejects and the entire home page crashes with an unhandled server error, showing users a 500 page instead of degraded content.

```typescript
const [newArrivalsResult, flashSaleResult, salesDataResult] = await Promise.allSettled([
  // ...queries...
]);
const newArrivals = newArrivalsResult.status === "fulfilled" ? newArrivalsResult.value.data || [] : [];
const flashSaleProducts = flashSaleResult.status === "fulfilled" ? flashSaleResult.value.data || [] : [];
const salesData = salesDataResult.status === "fulfilled" ? salesDataResult.value : null;
```

<!-- agent:ErrorHandling confidence:0.85 -->

---

## `src/services/inventoryService.ts`

---

### Line 67

```typescript
console.log(`General inventory reserve failed for ${productId}, checking size-based stock...`);
```

**Major: Debug Code**

Raw `console.log` and `console.error` calls (lines 67, 75, 85, 112) in a service handling inventory operations expose internal product IDs and stock quantities. The project introduced a structured logger (`src/lib/logger.ts`) with PII redaction in this same changeset — these calls should use it for consistency and data safety.

```typescript
import { logger } from '@/lib/logger';
// Replace all console.log/error calls:
logger.info(`General inventory reserve failed, checking size-based stock...`);
```

<!-- agent:DebugCode confidence:0.95 -->

---

## `src/services/loyaltyService.ts`

---

### Line 370

```typescript
console.error("Error awarding signup points:", txError);
```

**Major: Debug Code**

Uses `console.error` directly instead of the project's `logger.error` utility. This bypasses PII redaction — the `txError` object may contain user IDs or other sensitive data that should be redacted in production.

```typescript
import { logger } from '@/lib/logger';
logger.error("Error awarding signup points:", txError);
```

<!-- agent:DebugCode confidence:0.95 -->

---

## `src/services/paymentService.ts`

---

### Line 14

```typescript
): Promise<any> {
```

**Major: Type Safety**

All callers of `paystackRequest` lose type information about the Paystack API response shape. Errors in response property access (e.g., `data.data.status`) are invisible until runtime.

```typescript
interface PaystackApiResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url?: string;
    reference?: string;
    status?: string;
    [key: string]: unknown;
  };
}

): Promise<PaystackApiResponse> {
```

<!-- agent:TypeSafety confidence:0.92 -->

---

## `src/middleware.ts`

---

### Line 28

```typescript
const allowedOrigin = new URL(appUrl).origin;
```

**Major: Error Handling**

If `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL` is set to an invalid URL (e.g., `localhost:3000` without protocol), `new URL()` throws a TypeError, crashing the middleware and making ALL API routes return 500 errors.

```typescript
let allowedOrigin: string;
try {
  allowedOrigin = new URL(appUrl).origin;
} catch {
  // Malformed URL config - skip CSRF check rather than crash all requests
  return await updateSession(request);
}
```

<!-- agent:ErrorHandling confidence:0.85 -->

---

## `src/app/(marketplace)/products/[id]/page.tsx`

---

### Line 135

```typescript
dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
```

**Major: Error Handling**

If product data contains `</script>`, `JSON.stringify` does NOT escape that sequence, potentially allowing XSS injection via the JSON-LD script tag. This is a security-relevant error handling gap.

```typescript
dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
```

<!-- agent:ErrorHandling confidence:0.82 -->

---

## `src/app/api/orders/create/route.ts`

---

### Line 132

```typescript
(sum: number, item: any) => sum + item.price * item.quantity,
```

**Minor: Type Safety**

The `item` has a known shape from the validated Zod schema. Using `any` bypasses type-checking on `item.price` and `item.quantity` access. Let TypeScript infer the type.

```typescript
(sum, item) => sum + item.price * item.quantity,
```

<!-- agent:TypeSafety confidence:0.85 -->

---

## `src/app/sitemap.ts`

---

### Line 41

```typescript
console.error('Error fetching products for sitemap:', error)
```

**Minor: Debug Code**

Inconsistent logging approach — other files in this changeset use the new logger utility. Using raw `console.error` here means this file won't benefit from structured log formatting or future log aggregation.

```typescript
import { logger } from '@/lib/logger'
logger.error('Error fetching products for sitemap:', error)
```

<!-- agent:DebugCode confidence:0.90 -->

---

## `src/app/api/upload/image/route.ts`

---

### Line 103

```typescript
const fileExt = file.name.split(".").pop()?.toLowerCase();
```

**Minor: Error Handling**

If `file.name` has no extension (no dot), `split(".").pop()` returns the full filename, producing a path like `products/uuid.filename` instead of a proper extension. This could cause storage issues or MIME type mismatches.

```typescript
const fileExt = file.name.split(".").pop()?.toLowerCase();
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
  return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
}
```

<!-- agent:ErrorHandling confidence:0.75 -->

---

## `src/services/paymentService.ts` (continued)

---

### Line 212

```typescript
return { success: false, status: data.data?.status || 'failed' };
```

**Minor: Type Safety**

If `data.data?.status` is an empty string `''`, the `||` operator falls through to `'failed'`, silently discarding the actual status value. Using `??` only falls through for null/undefined.

```typescript
return { success: false, status: data.data?.status ?? 'failed' };
```

<!-- agent:TypeSafety confidence:0.80 -->

---

### Line 159

```typescript
newArrivals.forEach((p: any) => allProductIds.add(p.id));
```

**Minor: Type Safety**

Multiple inline `any` annotations on product iterators (lines 159-161, 176, 189-190). These are all `Product` instances — if the arrays are properly typed as `Product[]`, these inline annotations become unnecessary.

```typescript
newArrivals.forEach((p) => allProductIds.add(p.id));
```

<!-- agent:TypeSafety confidence:0.85 -->
