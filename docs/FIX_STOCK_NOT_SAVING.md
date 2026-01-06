# Fix Stock Quantity Not Saving

## Problem
When creating products, the stock quantity is not being saved. The inventory table shows NULL values for stock_quantity and reserved_quantity.

## Root Cause
The inventory INSERT is failing due to one of:
1. Missing RLS policy for inventory INSERT
2. Silent failure in InventoryService.initializeInventory()
3. Initial stock value not being passed correctly

## Solution

### Step 1: Fix Existing Products (Run in Supabase SQL Editor)

```sql
-- Create inventory records for products that don't have them
INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
SELECT p.id, 0, 0
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = p.id
)
ON CONFLICT (product_id) DO NOTHING;
```

### Step 2: Verify RLS Policy Exists

```sql
-- Check if the inventory INSERT policy exists
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'inventory' AND cmd = 'INSERT';

-- If it doesn't exist, create it:
CREATE POLICY IF NOT EXISTS "Admins and managers can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

### Step 3: Test Product Creation

1. **Create a new product** with stock quantity (e.g., 50)
2. **Check your terminal** (where `npm run dev` is running) for:
   ```
   Initializing inventory for product <id> with stock: 50
   Successfully created inventory for product <id>
   ```
3. **If you see `Failed to create inventory`**, check the Supabase logs

### Step 4: Verify in Database

```sql
-- Check the latest product's inventory
SELECT 
  p.name,
  i.stock_quantity,
  i.reserved_quantity
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
ORDER BY p.created_at DESC
LIMIT 1;
```

## What I Fixed in the Code

1. ✅ **Added detailed logging** to product creation API
2. ✅ **Check if inventory creation succeeds** 
3. ✅ **Log errors** if inventory fails
4. ✅ **Made stock field required** in product form
5. ✅ **Better stock display** on dashboard (color-coded)

## Expected Terminal Output

When you create a product, you should see:
```
Product creation request body: { name: "...", initial_stock: 50, ... }
Validated product data: { ... }
Initializing inventory for product abc-123 with stock: 50
Successfully created inventory for product abc-123
```

If inventory fails, you'll see:
```
Failed to create inventory for product abc-123
Inventory initialization error: <error details>
```

## Verification Checklist

- [ ] Ran Step 1 SQL to fix existing products
- [ ] Verified RLS policy exists (Step 2)
- [ ] Created a new test product
- [ ] Checked terminal logs for "Successfully created inventory"
- [ ] Refreshed dashboard and saw stock number (not 0 or N/A)
- [ ] Verified in database using Step 4 SQL

## If Still Not Working

Share the **terminal output** when creating a product - the logs will show exactly where it's failing!
