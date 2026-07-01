# POS Seller Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional seller dropdown to the POS checkout so an admin or manager can attribute a sale to the employee who made it, ensuring that employee earns commission.

**Architecture:** `POSInterface` fetches all non-admin employees and holds `selectedSellerId`/`selectedSellerCode` state; it passes the list and selection down to `POSCart` as props. `POSCart` renders the dropdown in the checkout form and substitutes the selected seller's ID for the logged-in user's ID at submit time. No API or DB changes — the backend already handles `seller_id` and commission correctly.

**Tech Stack:** Next.js App Router, React (client components), TypeScript, Tailwind CSS

## Global Constraints

- UI styling must match existing POS form fields: `bg-white/10 border-2 border-white/20 text-white rounded-xl focus:border-primary focus:ring-2 focus:ring-rose-400/50`
- No new dependencies
- No API, database, or migration changes
- Seller selection is optional — the Complete Sale button must remain enabled when no seller is selected

---

### Task 1: Extend POSInterface with employee fetch and seller state

**Files:**
- Modify: `src/components/pos/POSInterface.tsx`

**Interfaces:**
- Produces: four new props passed to `POSCart`:
  - `employees: { id: string; employee_code: string; name: string }[]`
  - `sellerOverrideId: string | undefined`
  - `sellerOverrideCode: string | undefined`
  - `onSellerChange: (id: string | null, code: string | null) => void`

- [ ] **Step 1: Add `SellerEmployee` interface and three new state variables**

Open `src/components/pos/POSInterface.tsx`. After the `Category` interface (around line 17), add:

```typescript
interface SellerEmployee {
  id: string;
  employee_code: string;
  name: string;
}
```

Inside the `POSInterface` component body, after the existing `useState` declarations (around line 34), add:

```typescript
const [employees, setEmployees] = useState<SellerEmployee[]>([]);
const [selectedSellerId, setSelectedSellerId] = useState<string | undefined>(undefined);
const [selectedSellerCode, setSelectedSellerCode] = useState<string | undefined>(undefined);
```

- [ ] **Step 2: Add `fetchEmployees` function**

Add this function inside the component, after `fetchCategories` and before `fetchUserRole`:

```typescript
const fetchEmployees = async () => {
  try {
    const response = await fetch('/api/employees');
    if (!response.ok) return;
    const data = await response.json();
    const nonAdmins: SellerEmployee[] = (data.employees || [])
      .filter((e: any) => e.role !== 'admin')
      .map((e: any) => ({
        id: e.id,
        employee_code: e.employee_code,
        name: e.name,
      }));
    setEmployees(nonAdmins);
  } catch {
    // silently fail — selector simply won't appear
  }
};
```

- [ ] **Step 3: Trigger `fetchEmployees` when role is confirmed**

Add a new `useEffect` after the existing `useEffect` that calls `fetchProducts`, `fetchCategories`, and `fetchUserRole`:

```typescript
useEffect(() => {
  if (userRole === 'admin' || userRole === 'manager') {
    fetchEmployees();
  }
}, [userRole]);
```

- [ ] **Step 4: Reset seller state in `handleOrderComplete`**

Find the existing `handleOrderComplete` function (around line 136):

```typescript
const handleOrderComplete = () => {
  // Refresh products after order completion to update inventory
  fetchProducts();
};
```

Replace it with:

```typescript
const handleOrderComplete = () => {
  fetchProducts();
  setSelectedSellerId(undefined);
  setSelectedSellerCode(undefined);
};
```

- [ ] **Step 5: Pass new props to both `POSCart` renders**

`POSCart` is rendered in two places — the desktop layout and the mobile layout. Add the four new props to **both** calls.

Find the desktop `POSCart` (inside `<div className="col-span-1">`):

```tsx
<POSCart
  employeeId={employeeId}
  employeeCode={employeeCode}
  onOrderComplete={handleOrderComplete}
/>
```

Replace with:

```tsx
<POSCart
  employeeId={employeeId}
  employeeCode={employeeCode}
  onOrderComplete={handleOrderComplete}
  employees={employees}
  sellerOverrideId={selectedSellerId}
  sellerOverrideCode={selectedSellerCode}
  onSellerChange={(id, code) => {
    setSelectedSellerId(id ?? undefined);
    setSelectedSellerCode(code ?? undefined);
  }}
/>
```

Find the mobile `POSCart` (inside `{showMobileCart ? (`):

```tsx
<POSCart
  employeeId={employeeId}
  employeeCode={employeeCode}
  onOrderComplete={() => { handleOrderComplete(); setShowMobileCart(false); }}
/>
```

Replace with:

```tsx
<POSCart
  employeeId={employeeId}
  employeeCode={employeeCode}
  onOrderComplete={() => { handleOrderComplete(); setShowMobileCart(false); }}
  employees={employees}
  sellerOverrideId={selectedSellerId}
  sellerOverrideCode={selectedSellerCode}
  onSellerChange={(id, code) => {
    setSelectedSellerId(id ?? undefined);
    setSelectedSellerCode(code ?? undefined);
  }}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors relating to `POSInterface.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/components/pos/POSInterface.tsx
git commit -m "feat: fetch employees and hold seller state in POSInterface"
```

---

### Task 2: Add seller dropdown and override logic to POSCart

**Files:**
- Modify: `src/components/pos/POSCart.tsx`

**Interfaces:**
- Consumes from Task 1:
  - `employees: { id: string; employee_code: string; name: string }[]`
  - `sellerOverrideId: string | undefined`
  - `sellerOverrideCode: string | undefined`
  - `onSellerChange: (id: string | null, code: string | null) => void`

- [ ] **Step 1: Extend `POSCartProps` interface**

Find the `POSCartProps` interface at the top of `src/components/pos/POSCart.tsx`:

```typescript
interface POSCartProps {
  employeeId?: string;
  employeeCode?: string;
  onOrderComplete?: () => void;
}
```

Replace with:

```typescript
interface SellerEmployee {
  id: string;
  employee_code: string;
  name: string;
}

interface POSCartProps {
  employeeId?: string;
  employeeCode?: string;
  onOrderComplete?: () => void;
  employees?: SellerEmployee[];
  sellerOverrideId?: string;
  sellerOverrideCode?: string;
  onSellerChange?: (id: string | null, code: string | null) => void;
}
```

- [ ] **Step 2: Destructure new props in the component**

Find the component signature:

```typescript
export default function POSCart({
  employeeId,
  employeeCode,
  onOrderComplete,
}: POSCartProps) {
```

Replace with:

```typescript
export default function POSCart({
  employeeId,
  employeeCode,
  onOrderComplete,
  employees = [],
  sellerOverrideId,
  sellerOverrideCode,
  onSellerChange,
}: POSCartProps) {
```

- [ ] **Step 3: Use `sellerOverrideId` in the order create call**

In `handleCompleteSale`, find the block that sets `orderData.seller_id` for the **create** call (around line 234):

```typescript
// Include seller_id if employeeId is a valid UUID
if (
  employeeId &&
  typeof employeeId === "string" &&
  employeeId.trim() !== ""
) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(employeeId)) {
    orderData.seller_id = employeeId;
  }
}
```

Replace with:

```typescript
// Use selected seller override if set, otherwise fall back to logged-in employee
const effectiveSellerId = sellerOverrideId ?? employeeId;
if (
  effectiveSellerId &&
  typeof effectiveSellerId === "string" &&
  effectiveSellerId.trim() !== ""
) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(effectiveSellerId)) {
    orderData.seller_id = effectiveSellerId;
  }
}
```

- [ ] **Step 4: Use `effectiveSellerId` in the order update call**

Find the block that sets `updateData.seller_id` for the **update** call (around line 278):

```typescript
// Only include seller_id if employeeId is provided and is a valid UUID
if (
  employeeId &&
  typeof employeeId === "string" &&
  employeeId.trim() !== ""
) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(employeeId)) {
    updateData.seller_id = employeeId;
  } else {
    console.warn(
      "Invalid employeeId format, skipping seller_id:",
      employeeId
    );
  }
}
```

Replace with:

```typescript
// Use selected seller override if set, otherwise fall back to logged-in employee
const effectiveSellerIdForUpdate = sellerOverrideId ?? employeeId;
if (
  effectiveSellerIdForUpdate &&
  typeof effectiveSellerIdForUpdate === "string" &&
  effectiveSellerIdForUpdate.trim() !== ""
) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(effectiveSellerIdForUpdate)) {
    updateData.seller_id = effectiveSellerIdForUpdate;
  } else {
    console.warn(
      "Invalid seller ID format, skipping seller_id:",
      effectiveSellerIdForUpdate
    );
  }
}
```

- [ ] **Step 5: Reset seller on sale completion**

In the success block of `handleCompleteSale` (after `clearCart()`), find the existing resets:

```typescript
clearCart();
setCustomerName("");
setSaleDateTime("");
setPaymentMethod("cash");
setSocialPlatform("");
```

Add the seller reset after `setSocialPlatform("")`:

```typescript
onSellerChange?.(null, null);
```

Also add it in the **preview mode** success block (the `if (!hasDatabase)` path) — find the same group of resets there and add `onSellerChange?.(null, null);` after `setSocialPlatform("")`.

- [ ] **Step 6: Add the seller dropdown to the checkout form**

Find the "Sale Date/Time" block in the JSX (around line 448):

```tsx
{/* Sale Date/Time (Optional) */}
{items.length > 0 && (
  <div className="mb-4">
    ...
  </div>
)}
```

Insert the seller dropdown block **immediately after** the closing `)}` of the Sale Date/Time block:

```tsx
{/* Seller (Optional) — only shown for admin/manager when employees are loaded */}
{items.length > 0 && employees.length > 0 && (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-white/70 mb-2">
      Seller (Optional)
    </label>
    <select
      value={sellerOverrideId ?? ""}
      onChange={(e) => {
        const selected = employees.find((emp) => emp.id === e.target.value);
        onSellerChange?.(
          selected ? selected.id : null,
          selected ? selected.employee_code : null
        );
      }}
      className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 text-white rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-rose-400/50 transition-all"
    >
      <option value="">Select seller...</option>
      {employees.map((emp) => (
        <option key={emp.id} value={emp.id}>
          {emp.name} — {emp.employee_code}
        </option>
      ))}
    </select>
  </div>
)}
```

- [ ] **Step 7: Update the "Sale by" footer to show the override seller**

Find the "Employee Info" block at the bottom of the cart (around line 798):

```tsx
{/* Employee Info */}
{employeeCode && (
  <div className="mt-4 pt-4 border-t border-white/10 text-center">
    <p className="text-xs text-white/50">
      Sale by:{" "}
      <span className="font-semibold text-white/70">
        {employeeCode}
      </span>
    </p>
  </div>
)}
```

Replace with:

```tsx
{/* Employee Info */}
{(sellerOverrideCode ?? employeeCode) && (
  <div className="mt-4 pt-4 border-t border-white/10 text-center">
    <p className="text-xs text-white/50">
      Sale by:{" "}
      <span className="font-semibold text-white/70">
        {sellerOverrideCode ?? employeeCode}
      </span>
    </p>
  </div>
)}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Manual test — as admin**

Start the dev server (`npm run dev`) and sign in as an admin. Go to `/pos`.

Check the following:

| Scenario | Expected |
|---|---|
| Cart empty | Seller dropdown does not appear |
| Add a product to cart | Seller dropdown appears above cart items, labelled "Seller (Optional)" |
| Leave seller blank, complete sale | Sale submits; "Sale by: {admin code}" shows in footer |
| Select a seller, check footer | "Sale by: {seller code}" updates immediately |
| Select a seller, complete sale | Sale submits; success modal shows; seller dropdown resets to "Select seller..." |
| Sign in as a seller (not admin) | Seller dropdown does not appear (employees array is empty) |

- [ ] **Step 10: Commit**

```bash
git add src/components/pos/POSCart.tsx
git commit -m "feat: add seller selector to POS checkout for admin commission attribution"
```
