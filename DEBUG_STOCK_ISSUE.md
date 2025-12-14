# Debug: Stock Not Showing on Products Dashboard

## Quick Check

Run this SQL in Supabase to check if inventory exists for recent products:

```sql
-- Check recent products and their inventory
SELECT
  p.id,
  p.name,
  p.created_at,
  i.stock_quantity,
  i.reserved_quantity,
  CASE
    WHEN i.product_id IS NULL THEN 'NO INVENTORY'
    WHEN i.stock_quantity IS NULL THEN 'NULL STOCK'
    ELSE 'HAS STOCK'
  END as inventory_status
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
ORDER BY p.created_at DESC
LIMIT 10;
```

## Common Issues

### Issue 1: Inventory Function Not Running

**Symptom**: Product created but no inventory record

**Check**: Look at terminal/console when creating product. You should see:

```
Initializing inventory for product <id> with stock: X
Successfully created inventory for product <id>
```

**If you see errors**, the function might not exist or have permission issues.

### Issue 2: Function Returns False

**Symptom**: Function runs but returns false

**Fix**: Run this to update the function:

```sql
-- Copy contents of: supabase/migrations/update_inventory_function_set_stock.sql
-- Or run: supabase/migrations/RUN_THIS_NOW.sql (if you haven't run it yet)
```

### Issue 3: RLS Policy Blocking

**Symptom**: Function exists but can't insert

**Check**: The function uses `ON CONFLICT` which should bypass RLS, but verify:

```sql
-- Check if function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'initialize_product_inventory';
```

## Quick Fix

If inventory is missing for existing products, run:

```sql
-- Create inventory for products that don't have it
INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
SELECT p.id, 0, 0
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = p.id
)
ON CONFLICT (product_id) DO NOTHING;
```

## Verify Fix

After running fixes, check:

1. Refresh products dashboard
2. Stock should now show
3. Check browser console for any errors
4. Check terminal for inventory creation logs


