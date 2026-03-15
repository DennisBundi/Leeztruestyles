# Bulk Delete Orders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add checkbox-based multi-select bulk delete to the admin orders table, admin-only, any status.

**Architecture:** All changes are frontend-only in one file (`orders/page.tsx`). Bulk delete reuses the existing `DELETE /api/orders?id=` endpoint, called sequentially per selected order. No new API routes needed.

**Tech Stack:** React useState, Next.js App Router, Tailwind CSS

---

### Task 1: Add selection state and bulk delete handler

**Files:**
- Modify: `src/app/(admin)/dashboard/orders/page.tsx:22-38`

**Step 1: Add new state variables after the existing state declarations (around line 31)**

Find the block ending with:
```tsx
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
```

Add immediately after:
```tsx
  // Bulk delete state (admin only)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
```

**Step 2: Add bulk delete handlers after `handleDeleteCancel` (around line 231)**

Find:
```tsx
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setOrderToDelete(null);
  };
```

Add immediately after:
```tsx
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedOrderIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedOrderIds);
    let failCount = 0;
    const deletedIds: string[] = [];

    for (const id of ids) {
      try {
        const response = await fetch(`/api/orders?id=${id}`, { method: 'DELETE' });
        if (response.ok) {
          deletedIds.push(id);
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setOrders((prev) => prev.filter((o) => !deletedIds.includes(o.id)));
    setSelectedOrderIds(new Set());
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(false);

    if (failCount > 0) {
      alert(`${deletedIds.length} order(s) deleted. ${failCount} failed — please try again.`);
    }
  };
```

**Step 3: Verify TypeScript — no errors in this file**

Run: `npx tsc --noEmit 2>&1 | grep "orders/page"`
Expected: no output

**Step 4: Commit**

```bash
git add "src/app/(admin)/dashboard/orders/page.tsx"
git commit -m "feat(orders): add bulk delete state and handlers"
```

---

### Task 2: Add checkbox column to the table header

**Files:**
- Modify: `src/app/(admin)/dashboard/orders/page.tsx` — table `<thead>` section

**Step 1: Find the table header row**

Search for the `<thead>` block. It currently starts with a `<th>` for "Order". Find the opening `<tr>` inside `<thead>` and add a checkbox `<th>` as the first column, admin-only:

Find:
```tsx
                <thead className="bg-gray-50">
                  <tr>
```

Replace with:
```tsx
                <thead className="bg-gray-50">
                  <tr>
                    {userRole === 'admin' && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                          ref={(el) => {
                            if (el) el.indeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < filteredOrders.length;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          disabled={filteredOrders.length === 0}
                        />
                      </th>
                    )}
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep "orders/page"`
Expected: no output

**Step 3: Commit**

```bash
git add "src/app/(admin)/dashboard/orders/page.tsx"
git commit -m "feat(orders): add select-all checkbox to table header"
```

---

### Task 3: Add checkbox to each order row

**Files:**
- Modify: `src/app/(admin)/dashboard/orders/page.tsx` — each `<tr>` in the orders map

**Step 1: Find the row map**

Find:
```tsx
                filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-gray-900">
```

Replace the `<tr>` opening and add a checkbox cell before the first `<td>`:
```tsx
                filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className={`hover:bg-gray-50 transition-colors ${selectedOrderIds.has(order.id) ? 'bg-red-50' : ''}`}
                >
                  {userRole === 'admin' && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedOrderIds.has(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        disabled={isBulkDeleting}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-gray-900">
```

**Step 2: Fix colSpan on empty/error/loading rows**

The existing loading, error, and empty state rows use `colSpan={userRole === 'seller' ? 8 : 9}`. These need to account for the extra checkbox column when user is admin. Find all three `colSpan` usages and update:

Find (appears 3 times):
```tsx
colSpan={userRole === 'seller' ? 8 : 9}
```

Replace all with:
```tsx
colSpan={userRole === 'admin' ? 10 : userRole === 'seller' ? 8 : 9}
```

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep "orders/page"`
Expected: no output

**Step 4: Commit**

```bash
git add "src/app/(admin)/dashboard/orders/page.tsx"
git commit -m "feat(orders): add per-row checkboxes with selected row highlight"
```

---

### Task 4: Add floating action bar

**Files:**
- Modify: `src/app/(admin)/dashboard/orders/page.tsx` — just before the table `<div>`

**Step 1: Find the table wrapper**

Find the `<div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-x-auto">` that wraps the table. Add the action bar directly above it:

Find:
```tsx
      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-x-auto">
```

Replace with:
```tsx
      {/* Bulk Action Bar — admin only, visible when orders are selected */}
      {userRole === 'admin' && selectedOrderIds.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-red-800">
            {selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={isBulkDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete {selectedOrderIds.size} Order{selectedOrderIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-x-auto">
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep "orders/page"`
Expected: no output

**Step 3: Commit**

```bash
git add "src/app/(admin)/dashboard/orders/page.tsx"
git commit -m "feat(orders): add floating bulk action bar"
```

---

### Task 5: Add bulk delete confirmation modal

**Files:**
- Modify: `src/app/(admin)/dashboard/orders/page.tsx` — modal section at the bottom

**Step 1: Find the existing single-delete modal**

Find the block starting with:
```tsx
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
```

Add a new bulk delete modal immediately after the closing `)}` of the single-delete modal:

```tsx
      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete {selectedOrderIds.size} Orders</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              You are about to permanently delete <strong>{selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? 's' : ''}</strong>. All associated order items will also be deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteConfirm}
                disabled={isBulkDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBulkDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedOrderIds.size} Order${selectedOrderIds.size !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
```

**Step 2: Clear selection when filters change**

When the user changes search/status/type filters, the filtered list changes but selected IDs remain — this is confusing. Find the `filteredOrders` useMemo and add a `useEffect` to clear selection on filter change, after the existing filter useEffects:

Find:
```tsx
  const filteredOrders = useMemo(() => {
```

Add before it:
```tsx
  // Clear selection when filters change
  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [searchQuery, selectedStatus, selectedType, dateFilter]);

```

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep "orders/page"`
Expected: no output

**Step 4: Commit**

```bash
git add "src/app/(admin)/dashboard/orders/page.tsx"
git commit -m "feat(orders): add bulk delete confirmation modal and filter-change selection reset"
```
