# PR #7 Review: feat: add importation waitlist feature and PWA update prompt

## Summary

| Severity   | Count |
|------------|-------|
| Blocker    | 3     |
| Major      | 7     |
| Minor      | 11    |
| Suggestion | 10    |

---

## src/app/api/importation/status/route.ts

### Line 6 — Severity: Blocker
**[Security]** Unauthenticated email enumeration / IDOR — PII exposed to any caller.

Any anonymous person can query any email address and receive the applicant's status, admin rejection notes, and application timestamp. There is no authentication check on this endpoint, so an attacker can enumerate known or guessed emails to harvest PII from the waitlist database.

```ts
export async function GET(request: NextRequest) {
```

> Suggestion: Require authentication (check session via `createClient()`) or implement a signed one-time lookup token sent to the applicant's email. At minimum, do not return `admin_note` to unauthenticated callers and add IP-based rate limiting.

---

### Line 18 — Severity: Major
**[Security]** `admin_note` (internal rejection reason) returned to unauthenticated public endpoint.

The SELECT explicitly includes `admin_note`, which contains internal administrative comments. Returning this field to any anonymous caller exposes internal business logic and sensitive screening criteria not intended for public view.

```ts
.select("id, email, status, admin_note, created_at")
```

> Suggestion: Remove `admin_note` from the public status SELECT, or only return a sanitised user-friendly message derived from it.

---

### Line 24 — Severity: Minor
**[ErrorHandling]** All Supabase errors are treated as 404, masking real server errors.

Supabase `.single()` returns `PGRST116` when no row is found, but also returns errors for DB connectivity failures, permission issues, or malformed queries. The current `if (error || !data)` check maps all of these uniformly to a 404 "No application found" response. A genuine server error is indistinguishable from a missing record.

```ts
if (error || !data) {
```

> Suggestion: Differentiate between "no rows" (`error.code === 'PGRST116'`) and other errors, returning 404 only for the former and 500 for genuine failures.

---

### Line 30 — Severity: Minor
**[DebugCode]** Raw `console.error` in API route catch block — no structured logger.

Unstructured server-side console output makes production error tracing difficult; a structured logger would capture request context alongside error details.

```ts
console.error("Status check error:", error);
```

> Suggestion: Replace with a shared server-side logger utility once one is added to the project.

---

## src/app/api/importation/waitlist/route.ts

### Line 18 — Severity: Major
**[Security]** No rate limiting or duplicate submission prevention on public POST endpoint.

The waitlist sign-up endpoint is fully unauthenticated with no rate limiting, CAPTCHA, or duplicate-email guard. An attacker can flood the waitlist with thousands of fake applications, burying legitimate entries. The database has no UNIQUE constraint on email so duplicates are silently stored.

```ts
export async function POST(request: NextRequest) {
```

> Suggestion: Add a UNIQUE constraint on the `email` column in the migration (see finding below), return 409 Conflict for duplicates (`error.code === '23505'`), and add IP-based rate limiting via Next.js middleware.

---

### Line 20 — Severity: Major
**[TypeSafety]** `request.json()` returns `any` — request body is untyped.

All subsequent field accesses (`body.goods_category`, `body.full_name`, etc.) operate on an implicit `any`, meaning TypeScript cannot catch typos, wrong field names, or unexpected payload shapes at compile time.

```ts
const body = await request.json();
```

> Suggestion: Define a `WaitlistRequestBody` interface and cast: `const body = await request.json() as WaitlistRequestBody;`

---

### Line 55 — Severity: Minor
**[DebugCode]** Raw `console.error` in API route error handler — no structured logger.

```ts
console.error("Waitlist insert error:", error);
```

> Suggestion: Replace with a shared server-side logger utility.

---

### Line 61 — Severity: Minor
**[DebugCode]** Raw `console.error` in API route catch block — no structured logger.

```ts
console.error("Waitlist route error:", error);
```

> Suggestion: Replace with a shared server-side logger utility.

---

## src/app/api/importation/admin/route.ts

### Line 8 — Severity: Suggestion
**[CodeOrganization]** `requireAdmin()` is a file-local helper that will likely be copy-pasted into every admin-protected route.

The helper creates a Supabase client, fetches the user, and checks the role. This pattern should live in `src/lib/auth/` alongside `getUserRole` so all admin routes can import a single shared guard.

```ts
async function requireAdmin() {
```

> Suggestion: Move to `src/lib/auth/guards.ts` and export as a shared utility.

---

### Line 8 — Severity: Minor
**[TypeSafety]** Missing explicit return type on `requireAdmin()`.

Without a declared return type, the function implicitly returns `User | null` from the Supabase SDK. If the SDK type changes or the function is refactored, TypeScript won't catch callers that haven't updated their null-checks.

```ts
async function requireAdmin() {
```

> Suggestion: Add `Promise<import('@supabase/supabase-js').User | null>` as the return type.

---

### Line 29 — Severity: Major
**[ErrorHandling]** `Promise.all` for stats queries has no error handling — any DB failure throws unhandled.

If any of the three count queries fail (e.g., DB connection issue, table not found), `Promise.all` rejects and the unhandled exception propagates up. Since the GET handler has no try/catch wrapping this block, Next.js returns a 500 with an unformatted error response rather than a controlled JSON error, likely breaking the admin dashboard.

```ts
const [totalRes, pendingRes, approvedRes] = await Promise.all([
```

> Suggestion: Wrap the `Promise.all` (or the entire handler body) in a try/catch that returns a controlled `NextResponse.json({ error: 'Internal server error' }, { status: 500 })`.

---

### Line 51 — Severity: Minor
**[DebugCode]** Raw `console.error` in API route — no structured logger.

```ts
console.error("Importation admin GET error:", error);
```

> Suggestion: Replace with a shared server-side logger utility.

---

### Line 63 — Severity: Major
**[TypeSafety]** `request.json()` returns `any` — PATCH body is untyped.

The destructured fields `id`, `status`, and `admin_note` come from an implicit `any`, so TypeScript cannot verify their types. A caller passing `id: 123` (number) instead of a UUID string won't be caught at compile time. The destructured `status` is also `any`, not the `Status` union, despite the `includes` runtime check on line 70.

```ts
const body = await request.json();
```

> Suggestion: Define an `AdminPatchBody` interface (`{ id: string; status: "pending" | "approved" | "rejected"; admin_note?: string | null }`) and cast: `const body = await request.json() as AdminPatchBody;`

---

### Line 83 — Severity: Minor
**[DebugCode]** Raw `console.error` in API route — no structured logger.

```ts
console.error("Importation admin PATCH error:", error);
```

> Suggestion: Replace with a shared server-side logger utility.

---

## src/components/admin/ImportationAdmin.tsx

### Line 41 — Severity: Suggestion
**[CodeOrganization]** `ImportationAdmin` is 281 lines and owns multiple distinct concerns.

The component handles stats display, filter controls, the applications table, and an inline confirmation panel. The per-row confirmation panel (lines 232–271) and the application row itself (lines 168–230) are good candidates for extraction into `ApplicationRow` and `ConfirmActionPanel` sub-components, improving readability and testability.

```ts
export default function ImportationAdmin() {
```

> Suggestion: Extract `ApplicationRow` and `ConfirmActionPanel` into separate files under `src/components/admin/`.

---

### Line 44 — Severity: Suggestion
**[TypeSafety]** `statusFilter` inferred as `string` instead of `Status | "all"`.

`useState("all")` infers the type as `string`, so passing `statusFilter` to API params or comparing it against `Status` values loses type narrowing. A typo like `"pinding"` would compile without error.

```ts
const [statusFilter, setStatusFilter] = useState("all");
```

> Suggestion: Use `useState<Status | "all">("all")`.

---

### Line 47 — Severity: Minor
**[Naming]** `actionId` is an ambiguous name for the row confirmation state.

The variable holds the ID of the application row for which the confirmation panel is open, not an action's own ID. The name misleads developers into thinking it stores an action record identifier.

```ts
const [actionId, setActionId] = useState<string | null>(null);
```

> Suggestion: Rename to `confirmingAppId`, `expandedRowId`, or `activeConfirmId` to accurately reflect its purpose.

---

### Line 60 — Severity: Major
**[ErrorHandling]** `fetch()` call in `fetchApplications` has no try/catch — network errors silently fail.

If the network is unavailable or the server returns an unexpected error, the fetch rejects with a thrown exception. The component stays in a permanent loading state (`setLoading(false)` at line 66 runs only when the await resolves, not on throw), and the admin sees no feedback.

```ts
const res = await fetch(`/api/importation/admin?${params}`);
```

> Suggestion: Wrap the fetch in try/catch and set an error state on failure. Move `setLoading(false)` into a `finally` block to guarantee it always runs.

---

### Line 62 — Severity: Minor
**[TypeSafety]** `res.json()` result is untyped `any` — API response shape not validated.

`json.data` and `json.stats` are accessed directly on an `any`-typed value. If the API response shape changes, TypeScript will not flag the mismatch and the component will silently render undefined values.

```ts
const json = await res.json();
```

> Suggestion: Cast to the expected shape: `const json = await res.json() as { data: Application[]; stats: Stats };`

---

### Line 73 — Severity: Minor
**[TypeSafety]** `handleUpdateStatus` missing explicit return type.

Without a declared return type, callers cannot know this is an async void function. If a caller mistakenly awaits an unintended return value or adds a return statement during maintenance, TypeScript won't catch the change.

```ts
async function handleUpdateStatus(id: string, status: Status, note: string) {
```

> Suggestion: Annotate as `Promise<void>`.

---

### Line 74 — Severity: Major
**[ErrorHandling]** `handleUpdateStatus` fetch() call has no try/catch — network failures are silently swallowed.

If the PATCH request throws (network outage, timeout), the promise rejects and component state is left inconsistent: `actionId` is cleared (line 87), making the confirmation panel disappear, but the application status in the list is not updated. The admin has no way to know whether the action succeeded or failed and may incorrectly believe it succeeded.

```ts
const res = await fetch("/api/importation/admin", {
```

> Suggestion: Wrap in try/catch, add an error state to the component, display a message on failure, and move all cleanup state resets (`setActionId`, `setPendingAction`, `setNoteInput`) to a `finally` block. Also add an `else` branch for non-ok responses (the current `if (res.ok)` at line 80 silently ignores server-side errors).

---

### Line 156 — Severity: Suggestion
**[Naming]** Table-header map iterator `h` is an unclear single-letter abbreviation.

```ts
].map((h) => (
```

> Suggestion: Rename to `header` or `columnHeader` so the mapping is immediately readable.

---

## src/components/home/WaitlistModal.tsx

### Line 5 — Severity: Suggestion
**[CodeOrganization]** `GOODS_CATEGORIES` is defined identically in `WaitlistModal.tsx`, `ImportationAdmin.tsx`, and as `VALID_CATEGORIES` in the API route.

All three locations list the same 6 values. A category addition requires changes in three places.

```ts
const GOODS_CATEGORIES = [
```

> Suggestion: Extract to a shared constants file (e.g., `src/lib/constants/importation.ts`) imported by all three consumers.

---

### Line 13 — Severity: Suggestion
**[CodeOrganization]** `ORDER_VALUE_RANGES` is duplicated between `WaitlistModal.tsx` (line 13) and `waitlist/route.ts` (line 16, named `VALID_ORDER_VALUES`) with identical values.

```ts
const ORDER_VALUE_RANGES = [
```

> Suggestion: Extract to the shared constants file mentioned above.

---

### Line 46 — Severity: Suggestion
**[Naming]** `update` is too generic a name for the form-field setter.

In a component that also has `handleSubmit`, developers must inspect the body to understand what `update` updates.

```ts
function update(field: keyof FormState, value: string) {
```

> Suggestion: Rename to `updateField` or `setFormField`.

---

### Line 62 — Severity: Minor
**[TypeSafety]** `res.json()` result is untyped `any` — API response shape not validated.

`json.error` is accessed on an `any`-typed value. If the API changes its error key or structure, TypeScript will not catch the mismatch and the error message shown to the user could be `undefined`.

```ts
const json = await res.json();
```

> Suggestion: Cast to `{ error?: string; data?: unknown }`.

---

## src/components/PWARegister.tsx

### Line 17 — Severity: Blocker
**[DebugCode / Security]** `console.log` debug statement in production client-side component leaks internal service worker scope.

This statement runs in every user's browser in production, exposing the internal service worker scope URL to anyone who opens DevTools. This is debug code that must be removed before merging.

```ts
console.log('Service Worker registered:', registration.scope);
```

> Suggestion: Remove this line entirely. Successful service worker registration does not need to be logged in production.

---

## src/components/PWAUpdatePrompt.tsx

### Line 6 — Severity: Minor
**[Naming]** Boolean state variable `show` uses a bare noun/verb rather than the `isX` prefix convention.

`show` reads like an imperative action rather than a state descriptor.

```ts
const [show, setShow] = useState(false);
```

> Suggestion: Rename to `isVisible` or `isUpdateAvailable`.

---

### Line 9 — Severity: Major
**[Naming]** Two functions named `handleUpdate` exist in the same component scope, creating a misleading name collision.

The inner `handleUpdate` defined inside `useEffect` (line 9) calls `setShow(true)` and is registered as an event listener. The outer `handleUpdate` (line 16) calls `window.location.reload()` and is what the button actually calls. The naming collision makes it easy to confuse the two during maintenance.

```ts
const handleUpdate = () => setShow(true);
```

> Suggestion: Rename the event-listener callback to `handlePwaUpdatedEvent` (or `onSwUpdated`) to clearly distinguish it from the click handler.

---

## src/app/(marketplace)/importation/status/page.tsx

### Line 6 — Severity: Suggestion
**[CodeOrganization]** The `Status` type (`'pending' | 'approved' | 'rejected'`) is defined independently in this file, in `ImportationAdmin.tsx` (line 14), and in the admin API route.

```ts
type Status = "pending" | "approved" | "rejected";
```

> Suggestion: Extract to a shared types file (e.g., `src/types/importation.ts`) so all layers share one authoritative definition.

---

### Line 15 — Severity: Suggestion
**[CodeOrganization]** `STATUS_CONFIG` and `STATUS_STYLES` (in `ImportationAdmin.tsx`) both map the same `Status` keys to display properties but are defined independently.

```ts
const STATUS_CONFIG: Record<
```

> Suggestion: Merge into one shared `STATUS_CONFIG` constant to centralise all status presentation logic.

---

### Line 48 — Severity: Minor
**[Naming]** Negative boolean name `notFound` creates double-negative conditions.

`if (!notFound)` is awkward to read and violates the positive-naming convention where booleans use `is`/`has`/`should` prefixes.

```ts
const [notFound, setNotFound] = useState(false);
```

> Suggestion: Rename to `isNotFound` (still clear) or rethink as `applicationFound` / `isFound` with inverted logic.

---

### Line 51 — Severity: Minor
**[TypeSafety]** `handleCheck` missing explicit return type.

Convention for async event handlers is to annotate the return type. Without it, future modifications may accidentally return a value that suppresses form submission behavior.

```ts
async function handleCheck(e: React.FormEvent) {
```

> Suggestion: Annotate as `Promise<void>`.

---

## supabase/migrations/20260311_import_waitlist.sql

### Line 5 — Severity: Blocker
**[Security]** No UNIQUE constraint on `email` column — duplicate applications silently accepted.

Without a UNIQUE constraint, the same address can submit unlimited entries. The status-check endpoint silently returns only the most recent entry via `.limit(1)`, hiding prior applications. Combined with no authentication on the POST endpoint, this allows trivial spam flooding of the waitlist.

```sql
  email text not null,
```

> Suggestion: Change to `email text not null unique,` and handle the resulting `23505` error code in the POST route with a 409 Conflict response.

---

### Line 19 — Severity: Minor
**[Security]** Missing explicit SELECT denial policy — RLS intent is not documented in the migration.

RLS is enabled with only an INSERT policy. The SELECT denial for `anon`/`authenticated` roles is implicit (default deny when RLS is on with no matching policy). If RLS is accidentally disabled or a permissive policy is added later, all waitlist data becomes readable to any authenticated user directly via the Supabase client.

```sql
alter table public.import_waitlist enable row level security;
```

> Suggestion: Add a comment explicitly stating that SELECT/UPDATE/DELETE are intentionally blocked for `anon`/`authenticated` and only accessible via the service-role key in the backend API.

---

## src/components/admin/ImportationAdmin.tsx (continued)

### Line 5 — Severity: Suggestion
**[CodeOrganization]** `GOODS_CATEGORIES` is redefined here with the same values as in `WaitlistModal.tsx`.

See the finding on `WaitlistModal.tsx` line 5 — extract to a shared constants file to avoid drift.

```ts
const GOODS_CATEGORIES = [
```

> Suggestion: Import from `src/lib/constants/importation.ts`.
