# Code Review — seller dashboard, responsive products & POS, hydration fixes

**Commits reviewed:** a33a351..e3abc7b (12 commits)
**Files changed:** 7 | **Additions:** 545 | **Deletions:** 182

---

## Summary

| Severity | Count |
|----------|-------|
| Blocker  | 1     |
| Major    | 8     |
| Minor    | 3     |
| Suggestion | 3   |

---

## Findings

### `src/lib/auth/roles.ts`

#### [Blocker] Seller dashboard access breaks existing test assertions (line 65)

Adding `'dashboard'` to the seller's allowed sections contradicts two assertions in `tests/lib/auth/roles.test.ts`:

- Line 138: `expect(canAccessSection('seller', 'dashboard')).toBe(false)` — will now fail
- Line 216: `expect(sellerSections).not.toContain('dashboard')` — will now fail

CI will fail on the roles unit test. If this change is intentional, update both assertions to reflect the new expected behaviour. If sellers should not see the full admin dashboard (e.g. only a scoped seller view), revert this line and instead gate the dashboard route at render time.

```ts
// current — seller can access 'dashboard' section
return ['dashboard', 'orders', 'products', 'pos', 'profile', 'settings'].includes(section);
```

```ts
// fix: update roles.test.ts lines 138 and 216 to assert true/toContain for seller+dashboard,
// then add a covering test:
expect(canAccessSection('seller', 'dashboard')).toBe(true);
```

<!-- agent:TestCoverage confidence:0.99 -->

---

### `src/app/(admin)/dashboard/page.tsx`

#### [Major] `userRole` typed as `string | null` instead of `UserRole | null` (line 48)

`UserRole` is already exported from `@/lib/auth/roles`. Using `string` lets any string be assigned here — a typo like `'Seller'` or a renamed role value passes silently without a compiler error.

```ts
const [userRole, setUserRole] = useState<string | null>(null);
```

```ts
import type { UserRole } from '@/lib/auth/roles';
// ...
const [userRole, setUserRole] = useState<UserRole | null>(null);
```

<!-- agent:TypeSafety confidence:0.90 -->

---

#### [Major] `r.json()` called without checking `r.ok` — non-JSON error bodies throw unhandled (line 65)

If `/api/auth/role` returns a non-JSON error body (e.g. a 502 HTML page), `r.json()` throws a SyntaxError. The `.catch()` falls back to loading admin dashboard data with no user feedback, silently masking a broken auth check. A seller could end up seeing the full admin dashboard.

```ts
.then(r => r.json())
```

```ts
.then(r => { if (!r.ok) throw new Error('Role fetch failed'); return r.json(); })
```

<!-- agent:ErrorHandling confidence:0.85 -->

---

#### [Major] `role` destructured from `any` — API shape mismatch goes undetected (line 66)

`fetch().json()` returns `Promise<any>`, so the destructured `role` is silently `any`. If the API response shape changes (e.g. `{ userRole: ... }` instead of `{ role: ... }`), `setUserRole` will be set to `undefined` at runtime with no compile-time warning.

```ts
.then(({ role }) => {
```

```ts
.then(({ role }: { role: UserRole | null }) => {
```

<!-- agent:TypeSafety confidence:0.85 -->

---

#### [Major] Role-based render branch has no test coverage (line 243)

The dashboard now fetches the user's role and conditionally renders `<SellerDashboard />` or the admin dashboard. The fallback path — where role fetch fails and admin data is loaded — is particularly risky with no test: it could expose revenue charts and all-orders data to a seller.

```ts
if (userRole === 'seller') {
    return <SellerDashboard />;
  }
```

Add a test that mocks `/api/auth/role` returning `'seller'` and asserts `SellerDashboard` renders and admin charts do not. Also test the catch path (role fetch failure) to assert admin dashboard loads as fallback and no seller-visible data leaks.

<!-- agent:TestCoverage confidence:0.85 -->

---

### `src/components/dashboard/SellerDashboard.tsx`

#### [Major] `Order.status` typed as `string` instead of the established status union (line 23)

The project already uses `'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'` in `src/types/index.ts`. Using `string` here means the status comparisons on lines 270/272 (`order.status === 'completed'`) are unchecked — a typo or a future rename passes silently.

```ts
  status: string;
```

```ts
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
```

<!-- agent:TypeSafety confidence:0.90 -->

---

#### [Major] `response.json()` called before `response.ok` check — SyntaxError on non-JSON error bodies (line 43)

If the API returns a non-JSON response (e.g. a 503 or CDN error page), `response.json()` throws before reaching the `response.ok` check. The `catch` block handles it, but the HTTP status is lost, so the user sees a generic "Failed to load stats" with no actionable detail. The same pattern repeats in `fetchOrders` (line 65).

```ts
const data = await response.json();
if (!response.ok) {
  setError(data.error || 'Failed to load. Please retry.');
```

```ts
if (!response.ok) {
  setError('Failed to load stats. Please retry.');
  return;
}
const data = await response.json();
```

<!-- agent:ErrorHandling confidence:0.80 -->

---

#### [Major] New component with data-fetching and error-handling logic has no tests (line 27)

`SellerDashboard` is a 302-line component with two independent fetch functions, error state management, a retry flow, and conditional rendering for loading/error/empty states. No test file exists for it. The stats display (KES formatting, null stats fallback) and the error/retry flow will go undetected on regression.

At minimum, test: (1) renders loading skeletons initially, (2) renders stats after successful fetch, (3) renders error banner on fetch failure with a Retry button, (4) clicking Retry re-calls both fetch functions.

<!-- agent:TestCoverage confidence:0.90 -->

---

#### [Minor] Dead code: `if (response.ok)` block is unreachable after early return in `fetchStats` (line 48)

Lines 44–46 return early when `!response.ok`, so execution reaching line 48 is guaranteed to be `response.ok === true`. The `else` branch (`setStats(null)`) can never run. This misleads future maintainers into thinking a second check is needed.

```ts
if (response.ok) {
  setStats(data);
} else {
  setStats(null);
}
```

```ts
setStats(data);
```

<!-- agent:ErrorHandling confidence:0.80 -->

---

#### [Minor] Same dead `if (response.ok)` pattern in `fetchOrders` (line 70)

The `else` branch (`setOrders([])`) can never execute for the same reason as `fetchStats` above.

```ts
if (response.ok) {
  setOrders((data.orders || []).slice(0, 5));
} else {
  setOrders([]);
}
```

```ts
setOrders((data.orders || []).slice(0, 5));
```

<!-- agent:ErrorHandling confidence:0.80 -->

---

#### [Minor] `response.json()` result assigned to untyped `data` in `fetchOrders` (line 65)

Same issue as `fetchStats` line 43: `data.orders` is implicitly `any`, so `setOrders(data.orders.slice(0, 5))` silently accepts a non-`Order[]` payload.

```ts
const data = await response.json();
```

```ts
const data: { error?: string; orders?: Order[] } = await response.json();
```

<!-- agent:TypeSafety confidence:0.80 -->

---

### `src/components/pos/POSInterface.tsx`

#### [Major] New mobile cart toggle state has no test coverage (line 33)

`showMobileCart` and `mounted` are the backbone of the mobile POS layout — the sticky "View Cart" bar and the product/cart panel toggle are the primary mobile navigation. No `POSInterface.test.tsx` exists (only `POSCart.test.tsx` and `POSProductGrid.test.tsx`). A regression here breaks the POS workflow for sellers using phones.

```ts
const [showMobileCart, setShowMobileCart] = useState(false);
const [mounted, setMounted] = useState(false);
```

Add `tests/components/POSInterface.test.tsx`. Test: (1) product panel visible by default (`showMobileCart=false`), (2) clicking View Cart shows the cart panel, (3) cart item count badge appears when cart has items, (4) "Back to Products" returns to product panel.

<!-- agent:TestCoverage confidence:0.80 -->

---

### `src/components/pos/POSProductGrid.tsx`

#### [Suggestion] Keyboard handler duplicates fetch-sizes logic from `handleProductClick` (line 215)

The `onKeyDown` handler re-implements the same fetch-and-open-modal logic as `handleProductClick` (lines 43–71), but without the `console.error` logging and with subtly different guard ordering. The two paths will continue to diverge silently on any future change to how sizes are fetched.

```ts
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (processingProductId !== product.id) {
      setProcessingProductId(product.id);
      setSelectedProduct(product);
      setShowSizeColorModal(true);
      fetch(`/api/products/${product.id}/sizes`)
        .then(r => r.ok ? r.json() : { sizes: [] })
        .then(d => setAvailableSizes(d.sizes || []))
        .catch(() => setAvailableSizes([]))
        .finally(() => setProcessingProductId(null));
    }
  }
}}
```

Extract a shared `openProductModal(product)` function and call it from both `handleProductClick` and the `onKeyDown` handler.

<!-- agent:CodeOrganization confidence:0.85 -->

---

### `src/components/dashboard/SellerDashboard.tsx` (continued)

#### [Suggestion] `formatDate` helper is the third copy of the same function (line 83)

The same `formatDate` implementation already exists in `ReviewCard.tsx` and `ReviewModeration.tsx`. Bug fixes or locale changes must be applied in every copy.

```ts
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', { ... });
};
```

```ts
import { formatDate } from '@/lib/utils/dateUtils';
```

Create `src/lib/utils/dateUtils.ts` exporting `formatDate(dateStr: string | null): string` and import it in all three components.

<!-- agent:CodeOrganization confidence:0.85 -->

---

### `src/app/(admin)/dashboard/products/page.tsx`

#### [Suggestion] Identical 100-character Tailwind className repeated on four `<select>` elements (line 512)

Any styling adjustment (border colour, ring opacity) must be made in four places. Define a constant once.

```ts
className="px-4 py-3 bg-black/20 text-white border-2 border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
```

```ts
const selectClass = 'px-4 py-3 bg-black/20 text-white border-2 border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
// ...
className={selectClass}
```

<!-- agent:CodeOrganization confidence:0.80 -->
