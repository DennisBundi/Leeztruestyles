# 🚨 URGENT: Fix Inventory Not Being Created

## The Problem
When you create a new product, the inventory is not being created/updated.

## Root Cause
The `initialize_product_inventory` function doesn't have `SECURITY DEFINER`, so it runs with your user's permissions and RLS policies block it from inserting into the inventory table.

## ✅ QUICK FIX (2 minutes)

### Step 1: Open Supabase SQL Editor
Go to: **https://supabase.com/dashboard/project/pklbqruulnpalzxurznr/sql/new**

### Step 2: Run the Fix SQL
1. Open the file: **`supabase/migrations/FIX_INVENTORY_FUNCTION.sql`**
2. **Copy the ENTIRE contents**
3. **Paste** into Supabase SQL Editor
4. Click **"Run"** (or press `Ctrl+Enter`)
5. Wait for success message

### Step 3: Verify It Worked
Run this query:

```sql
SELECT 
  routine_name,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'initialize_product_inventory';
```

**Expected result:**
```
routine_name                    | security_type
initialize_product_inventory    | DEFINER
```

If `security_type` shows `INVOKER`, the fix didn't work. Try running the SQL again.

### Step 4: Test
1. Create a new product with stock quantity
2. Check the products dashboard - stock should now show
3. Check terminal - you should see: "Successfully created inventory for product..."

## What This Fix Does

1. ✅ Adds `SECURITY DEFINER` to the function (bypasses RLS)
2. ✅ Adds INSERT policy for inventory table (backup)
3. ✅ Adds INSERT policy for product_sizes table
4. ✅ Adds DELETE policy for product_sizes table

## If It Still Doesn't Work

### Check 1: Function Exists
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'initialize_product_inventory';
```

Should return 1 row.

### Check 2: Check Recent Products
```sql
SELECT 
  p.name,
  p.created_at,
  i.stock_quantity
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
ORDER BY p.created_at DESC
LIMIT 5;
```

If `stock_quantity` is NULL, inventory wasn't created.

### Check 3: Check Terminal Logs
When creating a product, check your terminal for:
- `Initializing inventory for product...`
- `Successfully created inventory...` OR error messages

Share the error messages if you see any!

## After Running the Fix

1. **Wait 10-30 seconds** (for schema cache to refresh)
2. **Create a new product** with stock
3. **Check products dashboard** - stock should appear
4. **If still not working**, check terminal for error messages


