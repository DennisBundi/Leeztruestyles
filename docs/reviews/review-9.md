# PR #9 Review — feat: add admin order detail page

## Summary

| Severity | Count |
|----------|-------|
| Blocker | 0 |
| Major | 8 |
| Minor | 6 |
| Suggestion | 5 |

---

## Findings

### [MAJOR] No unit tests for `GET /api/orders/[id]` route
**File:** `src/app/api/orders/[id]/route.ts:1`

The project has an established test pattern for API routes under `tests/api/orders/` (`create.test.ts`, `update.test.ts`, `customer.test.ts`). This new route has no corresponding test file. The following critical code paths are untested:

- Returns 401 when unauthenticated
- Returns 403 for `seller` role or no role
- Returns 404 for a missing order (`PGRST116`)
- Returns the correctly shaped response (including nested `customer`, `seller`, `items`) for admin/manager
- Falls back to `{ full_name: 'Guest Customer', email: 'N/A', phone: null }` when `order.user_id` is null
- Returns 500 on unexpected Supabase error

Regressions in auth enforcement or response shaping will not be caught by CI.

---

### [MAJOR] Internal DB error details leaked in 500 response
**File:** `src/app/api/orders/[id]/route.ts:69`

Line 69 returns `orderError.message` verbatim in the JSON response body under the `details` key when a database error occurs. This exposes internal Supabase/PostgREST error messages (table names, column names, query structure, constraint names) to any authenticated admin or manager. The `details` field should be removed from the client-facing 500 response; the server-side `console.error` on line 67 is already sufficient for debugging.

---

### [MAJOR] Internal exception message leaked in catch-all 500 response
**File:** `src/app/api/orders/[id]/route.ts:148`

Line 148 returns `error instanceof Error ? error.message : 'Unknown error'` in the `details` field of the catch-all 500 response. Unhandled exceptions may include stack traces, file paths, or runtime internals useful to an attacker. Remove the `details` field from the error response sent to clients; server-side logging on line 144 is already in place.

---

### [MAJOR] Unsafe `any` casts on Supabase query result and nested relation
**File:** `src/app/api/orders/[id]/route.ts:114`

Two back-to-back casts discard all type safety:
- Line 114: `(order.order_items as any[])` and `.map((item: any) => { ... })` — the Supabase typed client infers the shape of `order_items` from the select query; casting to `any[]` silently discards that inference and allows accessing misspelled or non-existent properties without a compile-time error.
- Line 115: `const product = item.products as any;` — since the select query explicitly lists `products ( name, images )`, the client can infer a typed shape; casting to `any` means access errors on `product.name` and `product.images` are silently ignored.

Define an `OrderItemRow` interface (or derive from the Supabase generated types) and remove both casts.

---

### [MAJOR] Untyped `data` from `r.json()` in `useEffect` fetch chain — implicit `any`
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:66`

`.then((data) => { ... })` receives the result of `r.json()`, which is `Promise<any>`. The variable `data` is therefore implicitly `any`, so accesses like `data.error` and `data.order` are unchecked. Define a response interface (e.g., `interface OrderApiResponse { order?: AdminOrderDetail; error?: string }`) and assert or validate against it. This would also allow TypeScript to catch the unchecked assignment on line 72 (`setOrder(data.order)`).

---

### [MAJOR] Untyped `data` from `res.json()` in `handleStatusUpdate` — implicit `any`
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:92`

`const data = await res.json()` is typed as `any`. The `data.error` access on line 93 is unchecked. Use the same typed response interface as the `useEffect` fetch, or a narrow local type, to prevent silent breakage if the API response shape changes.

---

### [MAJOR] `setOrder(data.order)` passes unvalidated `any` into typed state
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:72`

`setOrder(data.order)` passes an `any` value directly into `useState<AdminOrderDetail | null>`. TypeScript accepts this silently. If the API response is malformed, subsequent property accesses (`order.items.map(...)`, `order.total_amount.toLocaleString(...)`) will throw at runtime. A type guard or Zod schema would provide safety; at minimum, fixing the `data` type (see finding above) would surface the mismatch at compile time.

---

### [MAJOR] Initial fetch missing HTTP status check before parsing JSON
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:64`

The fetch chain on line 64 calls `.then((r) => r.json())` without first checking `r.ok` or `r.status`. If the server returns a non-2xx response with a non-JSON body (e.g., a 502 gateway error or an HTML error page), `r.json()` will throw a parse error that bypasses the application-level `data.error` checks on lines 67–71. The `catch` block will catch it, but the error message will be a confusing JSON parse failure. The `handleStatusUpdate` function on line 87 correctly checks `res.ok` — apply the same pattern here.

---

### [MINOR] Admin page performs no client-side role check before initiating API fetch
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:58`

The `useEffect` only verifies authentication (`if (!user)`), then immediately calls the API. Any authenticated customer who navigates directly to `/dashboard/orders/<uuid>` triggers a real API request before being redirected via the 403 response check on line 67. The API route correctly enforces authorization so there is no data breach, but the page should also check the user's role client-side — consistent with how other admin pages guard access — to avoid unnecessary API calls and provide an earlier redirect for non-admin users.

---

### [MINOR] Auth call has no `.catch()` — rejected promise leaves spinner indefinitely
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:58`

`supabase.auth.getUser().then(...)` has no `.catch()` handler. If the Supabase auth call itself rejects (e.g., network failure), the promise rejection is unhandled: `loading` will remain `true` indefinitely, leaving the user stuck on a spinner with no error message. Add a `.catch()` to set error state and clear the loading state.

---

### [MINOR] `order_items` null guard missing — `.map()` on null throws 500
**File:** `src/app/api/orders/[id]/route.ts:114`

If `order_items` is `null` (e.g., the relation returns nothing due to a data integrity issue), calling `.map()` on `null` will throw a runtime error that bubbles to the outer `catch` block, returning a generic 500 instead of an empty items list. A null guard (`order.order_items ?? []`) before the `.map()` prevents this.

---

### [MINOR] User fetch error silently falls back — masks genuine DB errors
**File:** `src/app/api/orders/[id]/route.ts:86`

Lines 86–87 log a `userError` but continue with the fallback `{ full_name: 'Guest Customer', email: 'N/A', phone: null }`. While graceful degradation is appropriate for a legitimate "user not found" case, a genuine DB error is silently swallowed and the API returns 200 with misleading placeholder data. Consider distinguishing between a `PGRST116` not-found error (where the fallback is correct) and an actual DB error (where a 500 or a dedicated flag would be more accurate).

---

### [MINOR] Inconsistent naming between paired state variables
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:51`

`statusFeedback` (line 51) and `feedbackType` (line 52) are tightly coupled state variables but use inconsistent word order. `statusFeedback` leads with `status` while `feedbackType` leads with `feedback`. A consistent pair such as `feedbackMessage` / `feedbackType` would make their relationship obvious and align with the `feedbackType` naming already chosen.

---

### [MINOR] Single-letter variable `r` used in promise `.then()` callback
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:65`

`.then((r) => r.json())` uses a single-letter name for the fetch `Response`. The single-letter convention applies to short `map`/`filter`/`reduce` callbacks, not promise chains. Using `res` or `response` improves readability, especially since a second `.then((data) => ...)` follows immediately and the contrast between the two values is unclear at a glance.

---

### [SUGGESTION] `OrderStatus` type, `ALL_STATUSES`, and `STATUS_COLORS` duplicate shared definitions
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:9`

`OrderStatus` (line 9) is already defined in `src/app/(marketplace)/profile/orders/types.ts`. `ALL_STATUSES` (line 41) encodes the same set of values. `STATUS_COLORS` (lines 33–39) is structurally near-identical to `STATUS_STYLES` in the same shared file. All three should be consolidated into a shared utility (e.g., `src/lib/utils/orderStatus.ts`) so that adding or renaming a status requires only one change.

---

### [SUGGESTION] Data-fetching logic should be extracted to a custom hook
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:55`

Lines 55–80 combine auth-gating, API fetch, and error/loading state management inside one `useEffect`. This pattern is repeated across multiple admin pages. Extracting into a `useAdminOrderDetail(orderId)` hook (returning `{ order, loading, error }`) would make the component body easier to read and the fetch logic independently testable. The auth guard (lines 57–63) is copy-pasted from other admin pages and is a candidate for a shared `useRequireAdminAuth()` hook.

---

### [SUGGESTION] Date formatting options are inlined and duplicated across many files
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:154`

`toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })` (lines 154–158) appears in at least five other files across the codebase. A shared utility such as `formatKEDate(date: string | Date): string` in `src/lib/utils/` would eliminate this duplication.

---

### [SUGGESTION] Inline className expression for status button should be a helper
**File:** `src/app/(admin)/dashboard/orders/[id]/page.tsx:200`

Lines 200–204 compute the button class via an inline ternary that concatenates `STATUS_COLORS[s]`, ring classes, and disabled classes. Extracting this into a named helper (e.g., `getStatusButtonClass(status: OrderStatus, active: boolean): string`) would make the JSX readable and the logic independently testable.

---

### [SUGGESTION] Untyped `catch` binding — minor style inconsistency
**File:** `src/app/api/orders/[id]/route.ts:143`

`catch (error)` defaults to `unknown` in TypeScript 4+ and is correctly narrowed with `error instanceof Error` on line 148. However, line 74 in `page.tsx` uses the explicit `catch (err: unknown)` annotation. Annotating `catch (error: unknown)` here would be consistent with the pattern used elsewhere in the same PR.
